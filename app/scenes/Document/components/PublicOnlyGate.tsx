import { type ReactNode, useEffect, useState } from "react";
import { PublicDocumentView } from "~/scenes/WebsitePublic";
import { client } from "~/utils/ApiClient";

type Access = "checking" | "member" | "public" | "error";

/** Checks access before the full document scene can mount or read private stores. */
export default function PublicOnlyGate({
  documentSlug,
  children,
}: {
  documentSlug: string;
  children: ReactNode;
}) {
  const [result, setResult] = useState<{ slug: string; access: Access }>({
    slug: documentSlug,
    access: "checking",
  });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setResult({ slug: documentSlug, access: "checking" });
    void client
      .post<{ publicOnly?: boolean; data?: unknown }>("/documents.info", {
        id: documentSlug,
      })
      .then(
        (response) => {
          if (active) {
            setResult({
              slug: documentSlug,
              access: response?.data
                ? response.publicOnly === true
                  ? "public"
                  : "member"
                : "error",
            });
          }
        },
        () => active && setResult({ slug: documentSlug, access: "error" })
      );
    return () => {
      active = false;
    };
  }, [documentSlug, attempt]);

  const access = result.slug === documentSlug ? result.access : "checking";
  if (access === "checking") {
    return <p role="status">Checking document access…</p>;
  }
  if (access === "error") {
    return (
      <div role="alert">
        <p>Document unavailable.</p>
        <button type="button" onClick={() => setAttempt((value) => value + 1)}>
          Retry
        </button>
      </div>
    );
  }
  if (access === "public") {
    return <PublicDocumentView allowComments />;
  }
  return <>{children}</>;
}
