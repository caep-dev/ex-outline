import { action, computed, observable, runInAction } from "mobx";
import type {
  PublicCollection,
  PublicDocument,
  PublicDocumentInfo,
  PublicDocumentSearchResult,
  PublicPage,
} from "@shared/types/websiteIntegration";
import type {
  DocsNavigationItem,
  DocsNavigationView,
} from "~/components/Sidebar/DocsNavigation";
import { client } from "~/utils/ApiClient";
import {
  NetworkError,
  OfflineError,
  ServiceUnavailableError,
  BadGatewayError,
  NotFoundError,
} from "~/utils/errors";

/** State of an ephemeral public read; error messages never contain server details. */
export interface PublicResource<T> {
  status: "idle" | "loading" | "ready" | "error" | "unavailable";
  data?: T;
  reason?: "pagination" | "network" | "service" | "request";
}

class PublicPaginationError extends Error {}

/** Builds an acyclic, stable public tree only after all pages are collected. */
export function buildPublicTree(
  documents: readonly PublicDocument[]
): DocsNavigationItem[] {
  const source = new Map(documents.map((document) => [document.id, document]));
  const nodes = new Map(
    documents.map((document) => [
      document.id,
      {
        id: document.id,
        kind: "document" as const,
        label: document.title,
        to: document.url,
        children: [] as DocsNavigationItem[],
      },
    ])
  );
  const roots: DocsNavigationItem[] = [];
  for (const document of source.values()) {
    const node = nodes.get(document.id);
    if (!node) {
      continue;
    }
    const visited = new Set([document.id]);
    let parent = document.parentDocumentId;
    let cyclic = false;
    while (parent && source.has(parent)) {
      if (visited.has(parent)) {
        cyclic = true;
        break;
      }
      visited.add(parent);
      parent = source.get(parent)?.parentDocumentId ?? null;
    }
    const parentNode =
      !cyclic && document.parentDocumentId
        ? nodes.get(document.parentDocumentId)
        : undefined;
    if (parentNode) {
      parentNode.children.push(node);
    } else {
      roots.push(node);
    }
  }
  const compare = (a: DocsNavigationItem, b: DocsNavigationItem) =>
    a.label.localeCompare(b.label) || a.id.localeCompare(b.id);
  roots.sort(compare);
  for (const node of nodes.values()) {
    node.children.sort(compare);
  }
  return roots;
}

/** Owns nonpersistent public DTOs, pagination and generation-safe reads. */
export class PublicDocsStore {
  @observable generation = 0;
  @observable.ref collections: PublicResource<PublicCollection[]> = {
    status: "idle",
  };
  @observable.ref document: PublicResource<PublicDocumentInfo> = {
    status: "idle",
  };
  @observable.ref selectedCollection: PublicResource<PublicCollection> = {
    status: "idle",
  };
  @observable.ref searchResults: PublicResource<PublicDocumentSearchResult[]> =
    { status: "idle" };
  @observable trees = new Map<string, PublicResource<DocsNavigationItem[]>>();
  @observable expandedIds = new Set<string>();
  @observable documentKey = "";
  @observable collectionKey = "";
  @observable searchQuery = "";
  @observable searchCollectionId: string | undefined;
  @observable hasMoreCollections = true;
  @observable hasMoreSearch = false;
  private collectionsOffset = 0;
  private searchOffset = 0;
  private directoryEpoch = 0;
  private documentEpoch = 0;
  private collectionEpoch = 0;
  private searchEpoch = 0;
  private treeEpochs = new Map<string, number>();
  private inflight = new Map<string, Promise<void>>();

  /** Projects public DTOs into the shared, identity-free navigation interface. */
  @computed get navigation(): DocsNavigationView {
    return {
      items: [...(this.collections.data ?? [])]
        .sort(
          (a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id)
        )
        .map((collection) => ({
          id: collection.id,
          kind: "collection",
          label: collection.name,
          to: collection.url,
          children: this.trees.get(collection.id)?.data ?? [],
        })),
      activeCollectionId:
        this.document.data?.collectionId ?? this.selectedCollection.data?.id,
      activeDocumentId: this.document.data?.id,
      expandedIds: this.expandedIds,
    };
  }

  /** Appends one collection page, or retries the complete directory from zero. */
  loadNextCollections(restart = false): Promise<void> {
    if (restart) {
      this.directoryEpoch += 1;
      this.inflight.delete("collections");
      runInAction(() => {
        this.collections = { status: "idle" };
        this.collectionsOffset = 0;
        this.hasMoreCollections = true;
      });
    }
    if (!this.hasMoreCollections) {
      return Promise.resolve();
    }
    const generation = this.generation;
    const epoch = this.directoryEpoch;
    return this.read("collections", async () => {
      const offset = this.collectionsOffset;
      const previous = this.collections.data ?? [];
      runInAction(() => {
        this.collections = {
          status: "loading",
          data: previous.length ? previous : undefined,
        };
      });
      try {
        const response = await client.fetch<PublicPage<PublicCollection>>(
          "/public.collections.list",
          "POST",
          { offset, limit: 100 }
        );
        if (generation !== this.generation || epoch !== this.directoryEpoch) {
          return;
        }
        const next = this.nextOffset(
          response,
          offset,
          new Set(previous.map((item) => item.id))
        );
        const entries = new Map(previous.map((item) => [item.id, item]));
        response.data.forEach((item) => entries.set(item.id, item));
        runInAction(() => {
          this.collections = { status: "ready", data: [...entries.values()] };
          this.collectionsOffset = next;
          this.hasMoreCollections = response.pagination.hasMore;
        });
      } catch (error) {
        if (generation === this.generation && epoch === this.directoryEpoch) {
          runInAction(() => {
            this.collections = {
              ...this.failure(error),
              data: previous.length ? previous : undefined,
            };
          });
        }
      }
    });
  }

  /** Loads only one expanded or targeted collection, aggregating before tree construction. */
  loadCollectionTree(collectionId: string, retry = false): Promise<void> {
    if (retry && !this.inflight.has(`tree:${collectionId}`)) {
      this.cancelCollection(collectionId);
    }
    if (!retry && this.trees.get(collectionId)?.status === "ready") {
      return Promise.resolve();
    }
    const generation = this.generation;
    const epoch = this.treeEpochs.get(collectionId) ?? 0;
    return this.read(`tree:${collectionId}`, async () => {
      runInAction(() => {
        this.trees.set(collectionId, { status: "loading" });
      });
      const entries = new Map<string, PublicDocument>();
      let offset = 0;
      try {
        while (true) {
          const response = await client.fetch<PublicPage<PublicDocument>>(
            "/public.documents.list",
            "POST",
            { collectionId, offset, limit: 100 }
          );
          if (
            generation !== this.generation ||
            epoch !== (this.treeEpochs.get(collectionId) ?? 0)
          ) {
            return;
          }
          const next = this.nextOffset(
            response,
            offset,
            new Set(entries.keys())
          );
          response.data.forEach((item) => entries.set(item.id, item));
          if (!response.pagination.hasMore) {
            break;
          }
          offset = next;
        }
        runInAction(() => {
          this.trees.set(collectionId, {
            status: "ready",
            data: buildPublicTree([...entries.values()]),
          });
        });
      } catch (error) {
        if (
          generation === this.generation &&
          epoch === (this.treeEpochs.get(collectionId) ?? 0)
        ) {
          runInAction(() => {
            const failure = this.failure(error);
            this.trees.set(collectionId, { ...failure });
            if (failure.status === "unavailable") {
              this.collections = {
                ...this.collections,
                data: this.collections.data?.filter(
                  (item) => item.id !== collectionId
                ),
              };
              this.expandedIds.delete(collectionId);
              if (this.collectionKey === collectionId) {
                this.selectedCollection = { status: "unavailable" };
              }
            }
          });
        }
      }
    });
  }

  /** Cancels further pages; a late response cannot erase the following read. */
  @action cancelCollection(collectionId: string) {
    this.treeEpochs.set(
      collectionId,
      (this.treeEpochs.get(collectionId) ?? 0) + 1
    );
    this.inflight.delete(`tree:${collectionId}`);
    if (this.trees.get(collectionId)?.status === "loading") {
      this.trees.set(collectionId, { status: "idle" });
    }
  }

  /** Expands static nodes and loads trees only when collections are disclosed. */
  @action toggle(id: string) {
    if (this.expandedIds.has(id)) {
      this.expandedIds.delete(id);
      this.cancelCollection(id);
    } else {
      this.expandedIds.add(id);
      if (this.collections.data?.some((item) => item.id === id)) {
        void this.loadCollectionTree(id);
      }
    }
  }

  /** Stops unfinished body and navigation reads when a route leaves. */
  @action leaveRoute() {
    this.documentEpoch += 1;
    this.collectionEpoch += 1;
    this.searchEpoch += 1;
    this.inflight.delete("document");
    this.inflight.delete("collection");
    this.inflight.delete("search");
    for (const id of this.trees.keys()) {
      if (this.trees.get(id)?.status === "loading") {
        this.expandedIds.delete(id);
      }
      this.cancelCollection(id);
    }
    this.document = { status: "idle" };
    this.selectedCollection = { status: "idle" };
    this.searchResults = { status: "idle" };
    this.documentKey = "";
    this.collectionKey = "";
  }

  /** Invalidates all identity-scoped requests and drops every public projection. */
  @action invalidate() {
    this.generation += 1;
    this.leaveRoute();
    this.directoryEpoch += 1;
    this.inflight.clear();
    this.collections = { status: "idle" };
    this.trees.clear();
    this.treeEpochs.clear();
    this.expandedIds.clear();
    this.collectionsOffset = 0;
    this.hasMoreCollections = true;
    this.hasMoreSearch = false;
    this.searchQuery = "";
    this.searchCollectionId = undefined;
  }

  /** RootStore clear includes this non-model store without IndexedDB persistence. */
  clear() {
    this.invalidate();
  }

  /** Revalidates a collection route, including directory entries on later pages. */
  loadCollection(collectionId: string): Promise<void> {
    const generation = this.generation;
    const epoch = ++this.collectionEpoch;
    this.inflight.delete("collection");
    runInAction(() => {
      this.collectionKey = collectionId;
      this.selectedCollection = { status: "loading" };
    });
    return this.read("collection", async () => {
      await this.loadNextCollections(true);
      const current = () =>
        generation === this.generation && epoch === this.collectionEpoch;
      const found = await this.findCollection(collectionId, current);
      if (!current()) {
        return;
      }
      if (!found) {
        runInAction(() => {
          this.selectedCollection = {
            status:
              this.collections.status === "ready" ? "unavailable" : "error",
          };
        });
        return;
      }
      runInAction(() => {
        this.selectedCollection = { status: "ready", data: found };
        this.expandedIds.add(collectionId);
      });
      await this.loadCollectionTree(collectionId, true);
    });
  }

  /** Rechecks the public body, locates its collection and expands visible ancestors. */
  loadDocument(id: string, revalidate = false): Promise<void> {
    if (
      !revalidate &&
      this.documentKey === id &&
      this.inflight.has("document")
    ) {
      return this.inflight.get("document") ?? Promise.resolve();
    }
    if (revalidate && this.document.data) {
      const collectionId = this.document.data.collectionId;
      runInAction(() => {
        if (this.trees.get(collectionId)?.status === "loading") {
          this.expandedIds.delete(collectionId);
        }
        this.cancelCollection(collectionId);
      });
    }
    const generation = this.generation;
    const epoch = ++this.documentEpoch;
    this.inflight.delete("document");
    runInAction(() => {
      this.documentKey = id;
      this.document = { status: "loading" };
    });
    return this.read("document", async () => {
      const current = () =>
        generation === this.generation && epoch === this.documentEpoch;
      try {
        const response = await client.fetch<{ data: PublicDocumentInfo }>(
          "/public.documents.info",
          "POST",
          { id }
        );
        if (!current()) {
          return;
        }
        const found = await this.findCollection(
          response.data.collectionId,
          current
        );
        if (!current()) {
          return;
        }
        if (!found) {
          // Offset lists are not snapshots. Verify again if the collection vanished.
          await client.fetch<{ data: PublicDocumentInfo }>(
            "/public.documents.info",
            "POST",
            { id }
          );
          if (current()) {
            runInAction(() => {
              this.document = { status: "error" };
            });
          }
          return;
        }
        runInAction(() => {
          this.document = { status: "ready", data: response.data };
          this.expandedIds.add(found.id);
        });
        await this.loadCollectionTree(found.id, true);
        if (!current()) {
          return;
        }
        if (this.trees.get(found.id)?.status === "unavailable") {
          runInAction(() => {
            this.document = { status: "loading" };
          });
          await client.fetch<{ data: PublicDocumentInfo }>(
            "/public.documents.info",
            "POST",
            { id }
          );
          if (current()) {
            runInAction(() => {
              this.document = { status: "error", reason: "request" };
            });
          }
          return;
        }
        runInAction(() => {
          const nodes = this.trees.get(found.id)?.data ?? [];
          const parents = new Map<string, string>();
          const stack = [...nodes];
          while (stack.length) {
            const node = stack.pop();
            if (!node) {
              continue;
            }
            for (const child of node.children) {
              parents.set(child.id, node.id);
              stack.push(child);
            }
          }
          let parent = parents.get(response.data.id);
          while (parent) {
            this.expandedIds.add(parent);
            parent = parents.get(parent);
          }
        });
      } catch (error) {
        if (current()) {
          runInAction(() => {
            this.document = { ...this.failure(error) };
            if (this.document.status === "unavailable") {
              this.clearDocumentProjections();
            }
          });
        }
      }
    });
  }

  /** Drops cached document titles conservatively when a slug is no longer visible. */
  @action private clearDocumentProjections() {
    // A slug may not map to an existing id. Invalidate every document projection,
    // including pending reads, without changing the identity generation.
    for (const id of this.trees.keys()) {
      this.cancelCollection(id);
    }
    this.trees.clear();
    this.expandedIds.clear();
    this.searchEpoch += 1;
    this.inflight.delete("search");
    this.searchResults = { status: "idle" };
    this.hasMoreSearch = false;
    this.searchOffset = 0;
  }

  /** Starts a fresh scoped search or appends the next page for the current query. */
  search(query: string, collectionId?: string, more = false): Promise<void> {
    if (!more) {
      this.searchEpoch += 1;
      this.inflight.delete("search");
      runInAction(() => {
        this.searchQuery = query;
        this.searchCollectionId = collectionId;
        this.searchOffset = 0;
        this.searchResults = { status: "idle" };
        this.hasMoreSearch = false;
      });
    }
    if (!query) {
      runInAction(() => {
        this.searchResults = { status: "ready", data: [] };
      });
      return Promise.resolve();
    }
    const epoch = this.searchEpoch;
    const generation = this.generation;
    return this.read("search", async () => {
      const previous = this.searchResults.data ?? [];
      runInAction(() => {
        this.searchResults = {
          status: "loading",
          data: previous.length ? previous : undefined,
        };
      });
      try {
        const response = await client.fetch<
          PublicPage<PublicDocumentSearchResult>
        >("/public.documents.search", "POST", {
          query,
          ...(collectionId ? { collectionId } : {}),
          offset: this.searchOffset,
          limit: 100,
        });
        if (epoch !== this.searchEpoch || generation !== this.generation) {
          return;
        }
        const offset = this.nextOffset(
          response,
          this.searchOffset,
          new Set(previous.map((item) => item.id))
        );
        const entries = new Map(previous.map((item) => [item.id, item]));
        response.data.forEach((item) => entries.set(item.id, item));
        runInAction(() => {
          this.searchResults = { status: "ready", data: [...entries.values()] };
          this.searchOffset = offset;
          this.hasMoreSearch = response.pagination.hasMore;
        });
      } catch (error) {
        if (epoch === this.searchEpoch && generation === this.generation) {
          runInAction(() => {
            this.searchResults = { ...this.failure(error) };
          });
        }
      }
    });
  }

  private async findCollection(
    id: string,
    current: () => boolean
  ): Promise<PublicCollection | undefined> {
    while (current()) {
      const found = this.collections.data?.find((item) => item.id === id);
      if (found) {
        return found;
      }
      if (
        this.collections.status === "error" ||
        this.collections.status === "unavailable" ||
        !this.hasMoreCollections
      ) {
        return undefined;
      }
      await this.loadNextCollections();
    }
    return undefined;
  }

  private nextOffset<T extends { id: string }>(
    page: PublicPage<T>,
    requested: number,
    seen: ReadonlySet<string>
  ): number {
    const next = page.pagination.offset + page.data.length;
    if (
      !Number.isSafeInteger(page.pagination.offset) ||
      page.pagination.offset < requested ||
      !Number.isSafeInteger(next) ||
      (page.pagination.hasMore &&
        (next <= requested || !page.data.some((item) => !seen.has(item.id))))
    ) {
      throw new PublicPaginationError("Public pagination made no progress");
    }
    return next;
  }

  private failure(
    error: unknown
  ): Pick<PublicResource<never>, "status" | "reason"> {
    if (error instanceof NotFoundError) {
      return { status: "unavailable" };
    }
    return {
      status: "error",
      reason:
        error instanceof PublicPaginationError
          ? "pagination"
          : error instanceof NetworkError || error instanceof OfflineError
            ? "network"
            : error instanceof ServiceUnavailableError ||
                error instanceof BadGatewayError
              ? "service"
              : "request",
    };
  }

  private read(key: string, task: () => Promise<void>): Promise<void> {
    const existing = this.inflight.get(key);
    if (existing) {
      return existing;
    }
    const promise = task().finally(() => {
      if (this.inflight.get(key) === promise) {
        this.inflight.delete(key);
      }
    });
    this.inflight.set(key, promise);
    return promise;
  }
}
