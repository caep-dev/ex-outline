import { type ReactNode, useEffect, useState } from "react";
import { observer } from "mobx-react";
import useStores from "~/hooks/useStores";
import { PublicFeedback } from "~/scenes/WebsitePublic/PublicFeedback";
import { PublicDocumentView } from "~/scenes/WebsitePublic";
import { client } from "~/utils/ApiClient";

type Access = "checking" | "member" | "public" | "error";

/** Checks access before the full document scene can mount or read private stores. */
function PublicOnlyGate({
  documentSlug,
  children,
}: {
  documentSlug: string;
  children: ReactNode;
}) {
  const { publicDocs } = useStores();
  const generation = publicDocs.generation;
  const [result, setResult] = useState<{
    slug: string;
    generation: number;
    access: Access;
  }>({
    slug: documentSlug,
    generation,
    access: "checking",
  });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setResult({ slug: documentSlug, generation, access: "checking" });
    void client
      .fetch<{ publicOnly?: boolean; data?: { document?: { id: string } } }>(
        "/documents.info",
        "POST",
        {
          id: documentSlug,
        }
      )
      .then(
        (response) => {
          if (active && publicDocs.generation === generation) {
            setResult({
              slug: documentSlug,
              generation,
              access: response?.data
                ? response.publicOnly === true
                  ? "public"
                  : "member"
                : "error",
            });
          }
        },
        () =>
          active &&
          publicDocs.generation === generation &&
          setResult({ slug: documentSlug, generation, access: "error" })
      );
    return () => {
      active = false;
    };
  }, [documentSlug, attempt, generation, publicDocs]);

  const access =
    result.slug === documentSlug && result.generation === generation
      ? result.access
      : "checking";
  if (access === "checking") {
    return <PublicFeedback state="loading" layout="fullscreen" />;
  }
  if (access === "error") {
    return (
      <PublicFeedback
        layout="fullscreen"
        state="error"
        retry={() => setAttempt((value) => value + 1)}
      />
    );
  }
  if (access === "public") {
    return <PublicDocumentView allowComments />;
  }
  return <>{children}</>;
}

export default observer(PublicOnlyGate);
