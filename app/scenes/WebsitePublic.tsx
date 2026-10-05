import { observer } from "mobx-react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { Link, useHistory, useLocation, useParams } from "react-router-dom";
import styled from "styled-components";
import type { ProsemirrorData } from "@shared/types";
import type {
  PublicCollection,
  PublicDocumentComment,
  PublicDocumentCommentsPage,
  PublicDocument,
  PublicDocumentInfo,
  PublicDocumentSearchResult,
  PublicPage,
} from "@shared/types/websiteIntegration";
import { publicUrl } from "@shared/utils/publicPath";
import Editor from "~/components/Editor";
import { WebsiteSessionProbe } from "~/components/WebsiteSessionProbe";
import env from "~/env";
import {
  claimWebsiteOidcAttempt,
  clearWebsiteOidcAttempt,
} from "~/utils/websiteOidcAttempt";
import { docsReturnPath } from "@shared/utils/docsReturnPath";
import { publicBasePath, publicPath } from "@shared/utils/publicPath";
import { setPostLoginPath } from "~/hooks/useLastVisitedPath";
import { redirectTo } from "~/utils/urls";
import useStores from "~/hooks/useStores";
import { client } from "~/utils/ApiClient";
import { AuthorizationError, NotFoundError } from "~/utils/errors";

type PageKind = "directory" | "document" | "search";
type LoadState<T> = { status: "loading" | "error" | "ready"; data?: T };

function usePublicData<T>(
  path: string,
  body: Record<string, string | number> | null
) {
  const [state, setState] = useState<LoadState<T>>({ status: "loading" });
  const generation = useRef(0);
  const bodyRef = useRef(body);
  bodyRef.current = body;
  const bodyKey = JSON.stringify(body);
  const [retryCount, setRetryCount] = useState(0);
  useEffect(() => {
    const current = ++generation.current;
    const requestBody = bodyRef.current;
    if (bodyKey === "null" || !requestBody) {
      setState({ status: "ready" });
      return;
    }
    setState({ status: "loading" });
    void client.post<T>(path, requestBody).then(
      (data) =>
        current === generation.current && setState({ status: "ready", data }),
      () => current === generation.current && setState({ status: "error" })
    );
    return () => {
      generation.current += 1;
    };
  }, [path, bodyKey, retryCount]);
  return {
    ...state,
    retry: () => {
      setState({ status: "loading" });
      setRetryCount((count) => count + 1);
    },
  };
}

function PublicFeedback({
  state,
  retry,
}: {
  state: "loading" | "error";
  retry: () => void;
}) {
  return state === "loading" ? (
    <p role="status">Loading documents…</p>
  ) : (
    <div role="alert">
      <p>Documents are temporarily unavailable.</p>
      <button type="button" onClick={retry}>
        Retry
      </button>
    </div>
  );
}

function PublicDirectory() {
  const { collectionId } = useParams<{ collectionId?: string }>();
  const [collectionOffset, setCollectionOffset] = useState(0);
  const [documentOffset, setDocumentOffset] = useState(0);
  useEffect(() => setDocumentOffset(0), [collectionId]);
  const collections = usePublicData<PublicPage<PublicCollection>>(
    "/public.collections.list",
    { offset: collectionOffset, limit: 100 }
  );
  const documents = usePublicData<PublicPage<PublicDocument>>(
    "/public.documents.list",
    collectionId ? { collectionId, offset: documentOffset, limit: 100 } : null
  );

  if (collections.status !== "ready") {
    return (
      <PublicFeedback state={collections.status} retry={collections.retry} />
    );
  }
  const entries = collections.data?.data ?? [];
  return (
    <>
      {entries.length === 0 ? (
        <p>No public collections yet.</p>
      ) : (
        <>
          <h2>Collections</h2>
          <ul>
            {entries.map((collection) => (
              <li key={collection.id}>
                <Link
                  to={collection.url}
                  aria-current={
                    collection.id === collectionId ? "page" : undefined
                  }
                >
                  {collection.name}
                </Link>
                {collection.description ? (
                  <p>{collection.description}</p>
                ) : null}
              </li>
            ))}
          </ul>
          <div>
            {collectionOffset > 0 ? (
              <button
                type="button"
                onClick={() =>
                  setCollectionOffset(Math.max(0, collectionOffset - 100))
                }
              >
                Previous collections
              </button>
            ) : null}
            {collections.data?.pagination.hasMore ? (
              <button
                type="button"
                onClick={() => setCollectionOffset(collectionOffset + 100)}
              >
                More collections
              </button>
            ) : null}
          </div>
        </>
      )}
      {collectionId ? (
        <section aria-label="Collection documents">
          <h2>Documents</h2>
          {documents.status !== "ready" ? (
            <PublicFeedback state={documents.status} retry={documents.retry} />
          ) : documents.data?.data.length ? (
            <ul>
              {documents.data.data.map((document) => (
                <li key={document.id}>
                  <a href={publicUrl(env.URL, document.url)}>
                    {document.title}
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p>This collection has no public documents.</p>
          )}
          {documents.status === "ready" ? (
            <div>
              {documentOffset > 0 ? (
                <button
                  type="button"
                  onClick={() =>
                    setDocumentOffset(Math.max(0, documentOffset - 100))
                  }
                >
                  Previous documents
                </button>
              ) : null}
              {documents.data?.pagination.hasMore ? (
                <button
                  type="button"
                  onClick={() => setDocumentOffset(documentOffset + 100)}
                >
                  More documents
                </button>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}
    </>
  );
}

function commentText(node: ProsemirrorData): string {
  if (node.text) {
    return node.text;
  }
  return (node.content ?? [])
    .map(commentText)
    .join(node.type === "doc" ? "\n" : "");
}

function PublicComments({
  documentId,
  onRevoked,
}: {
  documentId: string;
  onRevoked: () => void;
}) {
  const [comments, setComments] = useState<PublicDocumentComment[]>([]);
  const [offset, setOffset] = useState(0);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading"
  );
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(false);
  const [reload, setReload] = useState(0);
  const onRevokedRef = useRef(onRevoked);
  onRevokedRef.current = onRevoked;

  useEffect(() => {
    let active = true;
    if (offset === 0) {
      setComments([]);
    }
    setStatus("loading");
    void client
      .post<PublicDocumentCommentsPage>("/comments.list", {
        documentId,
        limit: 100,
        offset,
      })
      .then(
        (response) => {
          if (!active) {
            return;
          }
          setComments((previous) =>
            offset === 0 ? response.data : [...previous, ...response.data]
          );
          const following = response.pagination.offset + response.data.length;
          setNextOffset(
            response.data.length > 0 && following < response.pagination.total
              ? following
              : null
          );
          setStatus("ready");
        },
        (error: unknown) => {
          if (!active) {
            return;
          }
          setStatus("error");
          if (
            error instanceof AuthorizationError ||
            error instanceof NotFoundError
          ) {
            onRevokedRef.current();
          }
        }
      );
    return () => {
      active = false;
    };
  }, [documentId, offset, reload]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const value = text.trim();
    if (!value || submitting) {
      return;
    }
    setSubmitError(false);
    setSubmitting(true);
    void client
      .post("/comments.create", { documentId, text: value })
      .then(
        () => {
          setText("");
          setOffset(0);
          setReload((count) => count + 1);
        },
        (error: unknown) => {
          setSubmitError(true);
          if (
            error instanceof AuthorizationError ||
            error instanceof NotFoundError
          ) {
            onRevokedRef.current();
          }
        }
      )
      .finally(() => setSubmitting(false));
  };

  return (
    <section aria-label="Comments">
      <h2>Comments</h2>
      {status === "loading" ? <p role="status">Loading comments...</p> : null}
      {status === "error" ? (
        <div role="alert">
          <p>Comments are unavailable.</p>
          <button type="button" onClick={() => setReload((count) => count + 1)}>
            Retry comments
          </button>
        </div>
      ) : null}
      {comments.length > 0 || status === "ready" ? (
        <ul>
          {comments.map((comment) => (
            <li key={comment.id}>
              <strong>{comment.createdBy?.name ?? "Reader"}</strong>
              <p>{commentText(comment.data)}</p>
            </li>
          ))}
        </ul>
      ) : null}
      {status === "ready" && nextOffset !== null ? (
        <button type="button" onClick={() => setOffset(nextOffset)}>
          Load more comments
        </button>
      ) : null}
      <form onSubmit={submit}>
        <label htmlFor="public-document-comment">Comment</label>
        <textarea
          id="public-document-comment"
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
        <button
          type="submit"
          disabled={status !== "ready" || submitting || !text.trim()}
        >
          Post comment
        </button>
        {submitError ? (
          <p role="alert">Could not post your comment. Please retry.</p>
        ) : null}
      </form>
    </section>
  );
}

export function PublicDocumentView({
  allowComments = false,
}: {
  allowComments?: boolean;
}) {
  const { documentSlug } = useParams<{ documentSlug: string }>();
  const document = usePublicData<{ data: PublicDocumentInfo }>(
    "/public.documents.info",
    { id: documentSlug }
  );
  if (document.status !== "ready") {
    return <PublicFeedback state={document.status} retry={document.retry} />;
  }
  if (!document.data?.data) {
    return <p role="alert">Document not found.</p>;
  }
  const info = document.data.data;
  return (
    <article>
      <h1>{info.title}</h1>
      <Editor
        id={info.id}
        readOnly
        value={info.content}
        defaultValue={info.content}
      />
      {allowComments ? (
        <PublicComments
          key={info.id}
          documentId={info.id}
          onRevoked={document.retry}
        />
      ) : null}
    </article>
  );
}

function PublicSearch() {
  const location = useLocation();
  const history = useHistory();
  const query = new URLSearchParams(location.search).get("q")?.trim() ?? "";
  const [input, setInput] = useState(query);
  const [offset, setOffset] = useState(0);
  useEffect(() => setOffset(0), [query]);
  const results = usePublicData<PublicPage<PublicDocumentSearchResult>>(
    "/public.documents.search",
    query ? { query, offset, limit: 100 } : null
  );
  useEffect(() => setInput(query), [query]);
  return (
    <>
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          const value = input.trim();
          history.push(
            value ? `/search?q=${encodeURIComponent(value)}` : "/search"
          );
        }}
      >
        <label htmlFor="public-search">Search public documents</label>
        <input
          id="public-search"
          value={input}
          onChange={(event) => setInput(event.target.value)}
        />
        <button type="submit">Search</button>
      </form>
      {!query ? (
        <p>Enter a search term.</p>
      ) : results.status !== "ready" ? (
        <PublicFeedback state={results.status} retry={results.retry} />
      ) : results.data?.data.length ? (
        <ul>
          {results.data.data.map((item) => (
            <li key={item.id}>
              <a href={publicUrl(env.URL, item.url)}>{item.title}</a>
              <p>{item.excerpt}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p>No public documents found.</p>
      )}
      {query && results.status === "ready" ? (
        <div>
          {offset > 0 ? (
            <button
              type="button"
              onClick={() => setOffset(Math.max(0, offset - 100))}
            >
              Previous results
            </button>
          ) : null}
          {results.data?.pagination.hasMore ? (
            <button type="button" onClick={() => setOffset(offset + 100)}>
              More results
            </button>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

/** Public integrated directory, search, and read-only document surface. */
export function WebsitePublic({ kind }: { kind: PageKind }) {
  const { auth } = useStores();
  const location = useLocation();
  const [status, setStatus] = useState<
    "checking" | "anonymous" | "unavailable" | "active"
  >("checking");
  const mainRef = useRef<HTMLElement>(null);
  const path = location.pathname + location.search;
  const signInFailed = location.hash === "#website-signin-unavailable";
  useEffect(() => {
    mainRef.current?.focus();
  }, [location.pathname]);
  const origin = new URL(env.URL).origin;
  const returnPath = docsReturnPath(
    publicPath(publicBasePath(env.URL), path),
    origin
  );
  const automaticAttempted = useRef<string | null>(null);
  const signIn = (explicit = true) => {
    const attempt = claimWebsiteOidcAttempt(returnPath, origin, explicit);
    if (!attempt && !explicit) {
      return;
    }
    setPostLoginPath(path);
    const target = new URL(publicUrl(env.URL, "/auth/oidc"));
    target.searchParams.set("returnTo", returnPath);
    redirectTo(target.toString());
  };
  const onStatus = (next: "active" | "anonymous" | "unavailable") => {
    setStatus(next);
    if (
      next !== "active" ||
      signInFailed ||
      !auth.websiteIntegrationInitialized ||
      automaticAttempted.current === returnPath
    ) {
      return;
    }
    automaticAttempted.current = returnPath;
    signIn(false);
  };

  useEffect(() => {
    if (auth.authenticated) {
      clearWebsiteOidcAttempt();
    }
  }, [auth.authenticated]);

  useEffect(() => {
    if (!auth.config) {
      void auth.fetchConfig().catch(() => setStatus("unavailable"));
    }
  }, [auth]);

  return (
    <PublicShell>
      {!auth.authenticated &&
      !auth.isFetching &&
      auth.websiteIntegrationInitialized &&
      !auth.integrationAuthUnavailable ? (
        <WebsiteSessionProbe key={returnPath} onStatus={onStatus} />
      ) : null}
      <header>
        <h1>
          <Link to="/">Documents</Link>
        </h1>
        <nav aria-label="Documents navigation">
          <Link to="/">Browse</Link>
          <Link to="/search">Search</Link>
          {auth.authenticated ? (
            <Link to="/home">Workspace</Link>
          ) : (
            <button
              type="button"
              onClick={() => signIn()}
              disabled={auth.config?.initialized === false}
            >
              Sign in
            </button>
          )}
        </nav>
      </header>
      <main ref={mainRef} tabIndex={-1}>
        {auth.config && !auth.websiteIntegrationInitialized ? (
          <p>The document library is not initialized yet.</p>
        ) : kind === "directory" ? (
          <PublicDirectory />
        ) : kind === "document" ? (
          <PublicDocumentView />
        ) : (
          <PublicSearch />
        )}
      </main>
      {(signInFailed ||
        status === "unavailable" ||
        auth.integrationAuthUnavailable) &&
      !auth.authenticated ? (
        <div role="status">
          <p>
            Sign-in status is unavailable. Public documents remain available.
          </p>
          {auth.integrationAuthUnavailable ? (
            <button
              type="button"
              onClick={() => {
                void auth.fetchAuth().catch(() => {});
              }}
            >
              Retry sign-in status
            </button>
          ) : null}
        </div>
      ) : null}
    </PublicShell>
  );
}

const PublicShell = styled.div`
  max-width: 960px;
  margin: 0 auto;
  padding: 1.5rem;
  header,
  nav {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
  }
  header {
    justify-content: space-between;
  }
  main {
    margin-top: 2rem;
  }
  button {
    cursor: pointer;
  }
`;

export default observer(WebsitePublic);
