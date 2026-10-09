import { vi, beforeEach, describe, it, expect } from "vitest";
import type {
  PublicCollection,
  PublicDocument,
  PublicDocumentInfo,
} from "@shared/types/websiteIntegration";
import type { DocsNavigationItem } from "~/components/Sidebar/DocsNavigation";
import {
  NetworkError,
  NotFoundError,
  ServiceUnavailableError,
} from "~/utils/errors";
import { PublicDocsStore } from "./PublicDocsStore";

const fetch = vi.hoisted(() => vi.fn());
vi.mock("~/utils/ApiClient", () => ({
  client: {
    fetch,
    post: vi.fn(() => {
      throw new Error("Cross-identity transport dedup");
    }),
  },
}));
const page = <T>(data: T[], offset = 0, hasMore = false) => ({
  data,
  pagination: { offset, limit: 100, hasMore },
});
const collection = (id: string): PublicCollection => ({
  id,
  name: id,
  description: null,
  url: `/public/collection/${id}`,
});
const doc = (
  id: string,
  parentDocumentId: string | null = null
): PublicDocument => ({
  id,
  title: id,
  parentDocumentId,
  url: `/doc/${id}`,
  updatedAt: "2026-10-06",
});
function deferred<T>() {
  let resolve: (value: T) => void = () => {};
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
beforeEach(() => {
  fetch.mockReset();
});

describe("public projection lifecycle", () => {
  it("initializes once, shares pending reads, and does not advance cached pages on mount", async () => {
    const pending = deferred<ReturnType<typeof page<PublicCollection>>>();
    fetch.mockReturnValueOnce(pending.promise);
    const store = new PublicDocsStore();
    const first = store.ensureCollections();
    expect(store.ensureCollections()).toBe(first);
    pending.resolve(page([collection("a")], 0, true));
    await first;
    store.leaveRoute();
    await store.ensureCollections();
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(store.hasMoreCollections).toBe(true);
    store.invalidate();
    fetch.mockResolvedValueOnce(page([]));
    await store.ensureCollections();
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(store.collections.data).toEqual([]);
  });
  it("explicit collection retry refreshes both cached directory and tree", async () => {
    fetch.mockImplementation((path) =>
      Promise.resolve(
        path === "/public.collections.list"
          ? page([collection("c")])
          : page([doc("old")])
      )
    );
    const store = new PublicDocsStore();
    await store.loadCollection("c");
    fetch.mockImplementation((path) =>
      Promise.resolve(
        path === "/public.collections.list"
          ? page([{ ...collection("c"), name: "Updated" }])
          : page([doc("new")])
      )
    );
    await store.loadCollection("c", true);
    expect(store.selectedCollection.data?.name).toBe("Updated");
    expect(store.trees.get("c")?.data?.[0].id).toBe("new");
    expect(fetch).toHaveBeenCalledTimes(4);
  });
  it("reuses paginated directory and ready trees across collection routes", async () => {
    fetch.mockImplementation((path, _method, body) =>
      Promise.resolve(
        path === "/public.collections.list"
          ? body.offset === 0
            ? page([collection("a")], 0, true)
            : page([collection("b")], 1)
          : page([doc(`${body.collectionId}-doc`)])
      )
    );
    const store = new PublicDocsStore();
    await store.loadCollection("a");
    store.leaveRoute();
    await store.loadCollection("b");
    store.leaveRoute();
    await store.loadCollection("a");
    expect(
      fetch.mock.calls
        .filter((call) => call[0] === "/public.collections.list")
        .map((call) => call[2].offset)
    ).toEqual([0, 1]);
    expect(
      fetch.mock.calls
        .filter((call) => call[0] === "/public.documents.list")
        .map((call) => call[2].collectionId)
    ).toEqual(["a", "b"]);
  });
  it.each(["network", "service"])(
    "collapses a canceled pending tree after forced %s failure and restores it from navigation",
    async (reason) => {
      const pendingTree = deferred<ReturnType<typeof page<PublicDocument>>>();
      let infoReads = 0;
      let treeReads = 0;
      fetch.mockImplementation((path) => {
        if (path === "/public.documents.info") {
          return ++infoReads === 1
            ? Promise.resolve({
                data: {
                  ...doc("old"),
                  collectionId: "c",
                  content: { type: "doc" },
                },
              })
            : Promise.reject(
                reason === "network"
                  ? new NetworkError()
                  : new ServiceUnavailableError()
              );
        }
        if (path === "/public.collections.list") {
          return Promise.resolve(page([collection("c")]));
        }
        return ++treeReads === 1
          ? pendingTree.promise
          : Promise.resolve(page([doc("fresh")]));
      });
      const store = new PublicDocsStore();
      const old = store.loadDocument("slug");
      await vi.waitFor(() => expect(store.document.status).toBe("ready"));
      expect(store.loadDocument("slug")).toBe(old);
      await store.loadDocument("slug", true);
      expect(infoReads).toBe(2);
      expect(store.document).toEqual({ status: "error", reason });
      expect(store.expandedIds.has("c")).toBe(false);
      expect(store.trees.get("c")?.status).toBe("idle");
      expect(store.generation).toBe(0);
      store.toggle("c");
      await store.loadCollectionTree("c");
      pendingTree.resolve(page([doc("old")], 0, true));
      await old;
      expect(treeReads).toBe(2);
      expect(store.expandedIds.has("c")).toBe(true);
      expect(store.trees.get("c")?.data?.[0].label).toBe("fresh");
      expect(store.document).toEqual({ status: "error", reason });
    }
  );
  it("preserves a ready expanded tree when forced revalidation fails", async () => {
    let reads = 0;
    fetch.mockImplementation((path) =>
      path === "/public.documents.info"
        ? ++reads === 1
          ? Promise.resolve({
              data: {
                ...doc("old"),
                collectionId: "c",
                content: { type: "doc" },
              },
            })
          : Promise.reject(new NetworkError())
        : Promise.resolve(
            path === "/public.collections.list"
              ? page([collection("c")])
              : page([doc("old")])
          )
    );
    const store = new PublicDocsStore();
    await store.loadDocument("slug");
    const tree = store.trees.get("c");
    await store.loadDocument("slug", true);
    expect(store.document.reason).toBe("network");
    expect(store.expandedIds.has("c")).toBe(true);
    expect(store.trees.get("c")).toBe(tree);
    expect(store.trees.get("c")?.status).toBe("ready");
  });
  it("forces revocation revalidation while the ready body is still awaiting its tree", async () => {
    const pendingTree = deferred<ReturnType<typeof page<PublicDocument>>>();
    let reads = 0;
    fetch.mockImplementation((path) =>
      path === "/public.documents.info"
        ? ++reads === 1
          ? Promise.resolve({
              data: {
                ...doc("withdrawn"),
                collectionId: "c",
                content: { type: "doc" },
              },
            })
          : Promise.reject(new NotFoundError())
        : path === "/public.collections.list"
          ? Promise.resolve(page([collection("c")]))
          : pendingTree.promise
    );
    const store = new PublicDocsStore();
    const old = store.loadDocument("withdrawn-slug");
    await vi.waitFor(() => expect(store.document.status).toBe("ready"));
    const revalidation = store.loadDocument("withdrawn-slug", true);
    expect(revalidation).not.toBe(old);
    expect(store.document.status).toBe("loading");
    await revalidation;
    expect(reads).toBe(2);
    pendingTree.resolve(page([doc("withdrawn")], 0, true));
    await old;
    expect(store.document.status).toBe("unavailable");
    expect(store.navigation.items[0]?.children).toEqual([]);
    expect(
      fetch.mock.calls.filter((call) => call[0] === "/public.documents.list")
    ).toHaveLength(1);
  });
  it("collapses canceled pending trees on route leave and lets search navigation expand them again", async () => {
    const pendingTree = deferred<ReturnType<typeof page<PublicDocument>>>();
    fetch.mockImplementation((path) =>
      path === "/public.collections.list"
        ? Promise.resolve(page([collection("c")]))
        : path === "/public.documents.search"
          ? Promise.resolve(page([]))
          : pendingTree.promise
    );
    const store = new PublicDocsStore();
    await store.loadNextCollections();
    store.toggle("c");
    store.leaveRoute();
    await store.search("topic");
    expect(store.expandedIds.has("c")).toBe(false);
    pendingTree.resolve(page([doc("stale")], 0, true));
    await Promise.resolve();
    fetch.mockResolvedValueOnce(page([doc("fresh")]));
    store.toggle("c");
    await store.loadCollectionTree("c");
    expect(store.expandedIds.has("c")).toBe(true);
    expect(store.trees.get("c")?.data?.[0].label).toBe("fresh");
  });
  it.each(["known-slug", "unassociated-slug"])(
    "invalidates old navigation and search titles on fresh info 404 for %s without changing identity generation",
    async (slug) => {
      const store = new PublicDocsStore();
      fetch.mockImplementation((path) =>
        Promise.resolve(
          path === "/public.documents.info"
            ? {
                data: {
                  ...doc("withdrawn"),
                  collectionId: "c",
                  content: { type: "doc" },
                },
              }
            : path === "/public.collections.list"
              ? page([collection("c")])
              : page([doc("withdrawn")])
        )
      );
      await store.loadDocument("known-slug");
      store.leaveRoute();
      const lateTree = deferred<ReturnType<typeof page<PublicDocument>>>();
      const lateSearch = deferred<ReturnType<typeof page<PublicDocument>>>();
      fetch.mockImplementation((path) =>
        path === "/public.documents.info"
          ? Promise.reject(new NotFoundError())
          : path === "/public.documents.search"
            ? lateSearch.promise
            : lateTree.promise
      );
      const tree = store.loadCollectionTree("other");
      const search = store.search("withdrawn");
      await store.loadDocument(slug);
      expect(store.document.status).toBe("unavailable");
      expect(store.generation).toBe(0);
      expect(store.navigation.items[0].children).toEqual([]);
      expect(store.expandedIds.size).toBe(0);
      lateTree.resolve(page([doc("withdrawn")]));
      lateSearch.resolve(page([doc("withdrawn")]));
      await Promise.all([tree, search]);
      expect(store.trees.size).toBe(0);
      expect(store.searchResults.data).toBeUndefined();
      expect(store.document.status).toBe("unavailable");
      expect(
        fetch.mock.calls.filter((call) => call[0] === "/public.documents.info")
      ).toHaveLength(2);
    }
  );
  it("aggregates more than 100 documents before linking a child to a later-page parent", async () => {
    fetch
      .mockResolvedValueOnce(
        page(
          [
            doc("child", "parent"),
            ...Array.from({ length: 99 }, (_, i) => doc(`d${i}`)),
          ],
          0,
          true
        )
      )
      .mockResolvedValueOnce(page([doc("parent")], 100));
    const store = new PublicDocsStore();
    await store.loadCollectionTree("c");
    expect(store.trees.get("c")?.status).toBe("ready");
    expect(
      store.trees
        .get("c")
        ?.data?.find((node) => node.id === "parent")
        ?.children.map((node) => node.id)
    ).toEqual(["child"]);
    expect(fetch.mock.calls.map((call) => call[2])).toEqual([
      { collectionId: "c", offset: 0, limit: 100 },
      { collectionId: "c", offset: 100, limit: 100 },
    ]);
  });
  it("shares an expanded collection request within a generation", async () => {
    fetch.mockResolvedValue(page([doc("a")]));
    const store = new PublicDocsStore();
    await Promise.all([
      store.loadCollectionTree("c"),
      store.loadCollectionTree("c"),
    ]);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("handles orphans and cycles without losing a public node", async () => {
    fetch.mockResolvedValue(
      page([
        doc("orphan", "private"),
        doc("a", "b"),
        doc("b", "a"),
        doc("self", "self"),
      ])
    );
    const store = new PublicDocsStore();
    await store.loadCollectionTree("c");
    const ids: string[] = [];
    const walk = (nodes: readonly DocsNavigationItem[] | undefined) =>
      nodes?.forEach((node) => {
        ids.push(node.id);
        walk(node.children);
      });
    walk(store.trees.get("c")?.data);
    expect(ids.sort()).toEqual(["a", "b", "orphan", "self"]);
  });
  it("stops no-progress pagination and retries from page zero", async () => {
    fetch
      .mockResolvedValueOnce(page([doc("a")], 0, true))
      .mockResolvedValueOnce(page([doc("a")], 1, true));
    const store = new PublicDocsStore();
    await store.loadCollectionTree("c");
    expect(store.trees.get("c")?.status).toBe("error");
    expect(store.trees.get("c")?.data).toBeUndefined();
    fetch.mockResolvedValueOnce(page([doc("b")]));
    await store.loadCollectionTree("c", true);
    expect(fetch.mock.calls.at(-1)?.[2]).toEqual({
      collectionId: "c",
      offset: 0,
      limit: 100,
    });
    expect(store.trees.get("c")?.data?.map((node) => node.id)).toEqual(["b"]);
  });
  it("collapsing stops subsequent pages and cannot overwrite a fresh retry", async () => {
    const first = deferred<ReturnType<typeof page<PublicDocument>>>();
    fetch
      .mockReturnValueOnce(first.promise)
      .mockResolvedValueOnce(page([doc("new")]));
    const store = new PublicDocsStore();
    const old = store.loadCollectionTree("c");
    store.cancelCollection("c");
    await store.loadCollectionTree("c", true);
    first.resolve(page([doc("old")], 0, true));
    await old;
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(store.trees.get("c")?.data?.[0].id).toBe("new");
  });
  it("identity invalidation discards late data and does not reuse the client POST dedup", async () => {
    const first = deferred<ReturnType<typeof page<PublicCollection>>>();
    fetch
      .mockReturnValueOnce(first.promise)
      .mockResolvedValueOnce(page([collection("new")]));
    const store = new PublicDocsStore();
    const old = store.loadNextCollections();
    store.invalidate();
    await store.loadNextCollections();
    first.resolve(page([collection("old")]));
    await old;
    expect(store.collections.data?.map((item) => item.id)).toEqual(["new"]);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls[0].slice(0, 2)).toEqual([
      "/public.collections.list",
      "POST",
    ]);
  });
  it("deep links scan later collection pages and expand visible ancestors", async () => {
    fetch.mockImplementation((path, _method, body) => {
      if (path === "/public.documents.info") {
        return Promise.resolve({
          data: {
            ...doc("child"),
            content: { type: "doc", content: [] },
            collectionId: "target",
          },
        });
      }
      if (path === "/public.collections.list") {
        return Promise.resolve(
          body.offset === 0
            ? page(
                Array.from({ length: 100 }, (_, i) => collection(`c${i}`)),
                0,
                true
              )
            : page([collection("target")], 100)
        );
      }
      return Promise.resolve(page([doc("child", "parent"), doc("parent")]));
    });
    const store = new PublicDocsStore();
    await store.loadDocument("child");
    expect(store.document.status).toBe("ready");
    expect(store.expandedIds.has("target")).toBe(true);
    expect(store.expandedIds.has("parent")).toBe(true);
    expect(store.collections.data).toHaveLength(101);
  });
  it("rechecks a vanished collection and clears revoked content", async () => {
    fetch
      .mockResolvedValueOnce({
        data: {
          ...doc("child"),
          content: { type: "doc" },
          collectionId: "gone",
        },
      })
      .mockResolvedValueOnce(page([]))
      .mockRejectedValueOnce(new NotFoundError());
    const store = new PublicDocsStore();
    await store.loadDocument("child");
    expect(store.document.status).toBe("unavailable");
    expect(store.document.data).toBeUndefined();
  });
  it("removes a revoked collection discovered while reading its tree and rechecks the body", async () => {
    let informationReads = 0;
    fetch.mockImplementation((path) => {
      if (path === "/public.documents.info") {
        return ++informationReads === 1
          ? Promise.resolve({
              data: {
                ...doc("child"),
                content: { type: "doc" },
                collectionId: "gone",
              },
            })
          : Promise.reject(new NotFoundError());
      }
      if (path === "/public.collections.list") {
        return Promise.resolve(page([collection("gone")]));
      }
      return Promise.reject(new NotFoundError());
    });
    const store = new PublicDocsStore();
    await store.loadDocument("child");
    expect(store.document.status).toBe("unavailable");
    expect(store.document.data).toBeUndefined();
    expect(store.collections.data).toEqual([]);
    expect(informationReads).toBe(2);
  });
  it("keeps directory failures distinct from empty collections", async () => {
    fetch.mockRejectedValue(new Error("private upstream error"));
    const store = new PublicDocsStore();
    await store.loadNextCollections();
    expect(store.collections.status).toBe("error");
    expect(store.collections.data).toBeUndefined();
  });
  it("route and search replacement ignore reordered responses", async () => {
    const old = deferred<ReturnType<typeof page<PublicDocument>>>();
    fetch.mockReturnValueOnce(old.promise).mockResolvedValueOnce(page([]));
    const store = new PublicDocsStore();
    const pending = store.search("old");
    await store.search("new");
    old.resolve(page([doc("stale")]));
    await pending;
    expect(store.searchResults.data).toEqual([]);
    expect(store.searchQuery).toBe("new");
  });
  it("route replacement prevents an old document from mounting after a newer route", async () => {
    const previous = deferred<{
      data: PublicDocumentInfo;
    }>();
    const store = new PublicDocsStore();
    fetch.mockReturnValueOnce(previous.promise).mockImplementation((path) =>
      Promise.resolve(
        path === "/public.documents.info"
          ? {
              data: {
                ...doc("new"),
                collectionId: "c",
                content: { type: "doc" },
              },
            }
          : path === "/public.collections.list"
            ? page([collection("c")])
            : page([doc("new")])
      )
    );
    const old = store.loadDocument("old");
    await store.loadDocument("new");
    previous.resolve({
      data: { ...doc("old"), collectionId: "c", content: { type: "doc" } },
    });
    await old;
    expect(store.document.data?.id).toBe("new");
    expect(store.documentKey).toBe("new");
  });
  it("leaving a document route stops collection scanning after the pending page", async () => {
    const next = deferred<ReturnType<typeof page<PublicCollection>>>();
    fetch
      .mockResolvedValueOnce({
        data: {
          ...doc("target"),
          collectionId: "last",
          content: { type: "doc" },
        },
      })
      .mockReturnValueOnce(next.promise);
    const store = new PublicDocsStore();
    const reading = store.loadDocument("target");
    await Promise.resolve();
    store.leaveRoute();
    next.resolve(page([collection("first")], 0, true));
    await reading;
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(store.document.data).toBeUndefined();
  });
  it("a failed vanished-collection recheck stays a retryable failure", async () => {
    fetch
      .mockResolvedValueOnce({
        data: {
          ...doc("target"),
          collectionId: "gone",
          content: { type: "doc" },
        },
      })
      .mockResolvedValueOnce(page([]))
      .mockRejectedValueOnce(new Error("private network detail"));
    const store = new PublicDocsStore();
    await store.loadDocument("target");
    expect(store.document.status).toBe("error");
    expect(store.document.reason).toBe("request");
    expect(store.document.data).toBeUndefined();
  });
  it("rejects unsafe offsets as a safe pagination failure", async () => {
    fetch.mockResolvedValue(page([doc("a")], -1, true));
    const store = new PublicDocsStore();
    await store.loadCollectionTree("c");
    expect(store.trees.get("c")?.reason).toBe("pagination");
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
