import {
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { observer } from "mobx-react";
import { useTranslation } from "react-i18next";
import type { ProsemirrorData } from "@shared/types";
import type {
  PublicDocumentComment,
  PublicDocumentCommentsPage,
} from "@shared/types/websiteIntegration";
import { DocsStatus } from "~/components/DocsStatus";
import useStores from "~/hooks/useStores";
import { websitePublicTranslation } from "~/utils/websitePublicTranslation";
import { client } from "~/utils/ApiClient";
import { AuthorizationError, NotFoundError } from "~/utils/errors";

function commentText(node: ProsemirrorData): string {
  if (node.text) {
    return node.text;
  }
  return (node.content ?? [])
    .map(commentText)
    .join(node.type === "doc" ? "\n" : "");
}

/** Reads and writes comments only while the verified public reader remains mounted. */
export const PublicComments = observer(function PublicComments({
  documentId,
  onRevoked,
}: {
  documentId: string;
  onRevoked: () => void;
}) {
  const { t, i18n } = useTranslation();
  const { publicDocs, auth } = useStores();
  const generation = publicDocs.generation;
  const activeRef = useRef(true);
  useEffect(() => {
    activeRef.current = true;
    return () => {
      activeRef.current = false;
    };
  }, []);
  const isCurrent = useCallback(
    () =>
      activeRef.current &&
      publicDocs.generation === generation &&
      auth.authenticated &&
      !auth.integrationAuthUnavailable &&
      publicDocs.document.status === "ready" &&
      publicDocs.document.data?.id === documentId,
    [publicDocs, generation, auth, documentId]
  );
  const [comments, setComments] = useState<PublicDocumentComment[]>([]);
  const commentsRef = useRef(comments);
  commentsRef.current = comments;
  const [offset, setOffset] = useState(0);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading"
  );
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(false);
  const [paginationError, setPaginationError] = useState(false);
  const [reload, setReload] = useState(0);
  const onRevokedRef = useRef(onRevoked);
  onRevokedRef.current = onRevoked;

  useEffect(() => {
    let active = true;
    if (offset === 0) {
      setComments([]);
    }
    setStatus("loading");
    setPaginationError(false);
    void client
      .fetch<PublicDocumentCommentsPage>("/comments.list", "POST", {
        documentId,
        limit: 100,
        offset,
      })
      .then(
        (response) => {
          if (!active || !isCurrent()) {
            return;
          }
          const following = response.pagination.offset + response.data.length;
          if (
            !Number.isSafeInteger(response.pagination.offset) ||
            response.pagination.offset < offset ||
            !Number.isSafeInteger(following) ||
            (following < response.pagination.total &&
              (following <= offset ||
                response.data.length === 0 ||
                (offset > 0 &&
                  response.data.every((item) =>
                    commentsRef.current.some(
                      (previous) => previous.id === item.id
                    )
                  ))))
          ) {
            setPaginationError(true);
            setStatus("error");
            setNextOffset(null);
            return;
          }
          setComments((previous) => [
            ...new Map(
              (offset === 0
                ? response.data
                : [...previous, ...response.data]
              ).map((item) => [item.id, item])
            ).values(),
          ]);
          setNextOffset(
            response.data.length > 0 && following < response.pagination.total
              ? following
              : null
          );
          setStatus("ready");
        },
        (error: unknown) => {
          if (!active || !isCurrent()) {
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
  }, [documentId, offset, reload, generation, isCurrent]);

  const submitComment = () => {
    const value = text.trim();
    if (
      auth.logoutPending ||
      !value ||
      submitting ||
      status !== "ready" ||
      !isCurrent()
    ) {
      return;
    }
    setSubmitError(false);
    setSubmitting(true);
    void client
      .post("/comments.create", { documentId, text: value })
      .then(
        () => {
          if (!isCurrent()) {
            return;
          }
          setText("");
          setOffset(0);
          setReload((count) => count + 1);
        },
        (error: unknown) => {
          if (!isCurrent()) {
            return;
          }
          setSubmitError(true);
          if (
            error instanceof AuthorizationError ||
            error instanceof NotFoundError
          ) {
            onRevokedRef.current();
          }
        }
      )
      .finally(() => {
        if (isCurrent()) {
          setSubmitting(false);
        }
      });
  };

  return (
    <section aria-label={t("Comments")}>
      <h2>{t("Comments")}</h2>
      {status === "loading" ? (
        <DocsStatus
          state="loading"
          title={t("Comments")}
          content={t("Loading")}
        />
      ) : null}
      {status === "error" ? (
        <DocsStatus
          state="error"
          title={t("Comments")}
          content={
            paginationError
              ? t(
                  "Pagination could not complete. Retry to reload from the first page.",
                  websitePublicTranslation(
                    i18n.language,
                    "Pagination could not complete. Retry to reload from the first page.",
                    "分页加载未能完成，请重试以从第一页重新加载。"
                  )
                )
              : t(
                  "Comments are unavailable.",
                  websitePublicTranslation(
                    i18n.language,
                    "Comments are unavailable.",
                    "评论暂时不可用。"
                  )
                )
          }
          onRetry={() => {
            setOffset(0);
            setReload((count) => count + 1);
          }}
        />
      ) : null}
      {comments.length > 0 || status === "ready" ? (
        <ul>
          {comments.map((comment) => (
            <li key={comment.id}>
              <strong>
                {comment.createdBy?.name ??
                  t(
                    "Reader",
                    websitePublicTranslation(i18n.language, "Reader", "读者")
                  )}
              </strong>
              <p>{commentText(comment.data)}</p>
            </li>
          ))}
        </ul>
      ) : null}
      {status === "ready" && nextOffset !== null ? (
        <button type="button" onClick={() => setOffset(nextOffset)}>
          {t(
            "Load more comments",
            websitePublicTranslation(
              i18n.language,
              "Load more comments",
              "加载更多评论"
            )
          )}
        </button>
      ) : null}
      <form
        onSubmit={(event: FormEvent) => {
          event.preventDefault();
          submitComment();
        }}
      >
        <label htmlFor="public-document-comment">{t("Comment")}</label>
        <textarea
          disabled={auth.logoutPending}
          id="public-document-comment"
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
        <button
          type="submit"
          disabled={
            auth.logoutPending ||
            status !== "ready" ||
            submitting ||
            !text.trim()
          }
        >
          {t("Post")}
        </button>
        {submitError ? (
          <DocsStatus
            state="error"
            title={t("Comments")}
            content={t(
              "Could not post your comment. Please retry.",
              websitePublicTranslation(
                i18n.language,
                "Could not post your comment. Please retry.",
                "评论提交失败，请重试。"
              )
            )}
            onRetry={submitComment}
          />
        ) : null}
      </form>
    </section>
  );
});
