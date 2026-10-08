import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { publicBasePath, publicPath } from "@shared/utils/publicPath";
import { docsReturnPath } from "@shared/utils/docsReadingReturnPath";
import { DocsStatus } from "~/components/DocsStatus";
import { DocsRecoveryLayout } from "~/components/DocsRecoveryLayout";
import Button from "~/components/Button";
import { useWebsiteIdentity } from "~/components/WebsiteIdentityController";
import env from "~/env";
import useStores from "~/hooks/useStores";
import { preflightDocsReading } from "~/utils/docsReadingPreflight";
import { NotFoundError } from "~/utils/errors";
import { websitePublicTranslation } from "~/utils/websitePublicTranslation";

/** Rechecks the final reading route before consuming its one-use recovery marker. */
export function DocsReadingResume() {
  const location = useLocation();
  const { auth } = useStores();
  const { finishReadingResume } = useWebsiteIdentity();
  const { t, i18n } = useTranslation();
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const target = docsReturnPath(
    publicPath(publicBasePath(env.URL), location.pathname + location.search),
    new URL(env.URL).origin
  );
  useEffect(() => {
    let active = true;
    setError(false);
    void preflightDocsReading(target, new URL(env.URL).origin).then(
      (available) => {
        if (active) {
          finishReadingResume(available);
        }
      },
      (failure: unknown) => {
        if (!active) {
          return;
        }
        if (failure instanceof NotFoundError) {
          finishReadingResume(false);
        } else {
          setError(true);
        }
      }
    );
    return () => {
      active = false;
    };
    // The controller callback changes on render; route and verified generation own this read.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, attempt, auth.sessionGeneration]);
  return (
    <DocsRecoveryLayout>
      <DocsStatus
        state={error ? "error" : "loading"}
        title={t("Documents")}
        content={
          error
            ? t(
                "Documents are unavailable. Try again.",
                websitePublicTranslation(
                  i18n.language,
                  "Documents are unavailable. Try again.",
                  "\u6682\u65f6\u65e0\u6cd5\u52a0\u8f7d\u6587\u6863\uff0c\u8bf7\u91cd\u8bd5\u3002"
                )
              )
            : t("Loading")
        }
        onRetry={error ? () => setAttempt((value) => value + 1) : undefined}
      />
      {error && (
        <Button type="button" onClick={() => finishReadingResume(false)}>
          {t(
            "Back to documents",
            websitePublicTranslation(
              i18n.language,
              "Back to documents",
              "\u8fd4\u56de\u516c\u5f00\u6587\u6863"
            )
          )}
        </Button>
      )}
    </DocsRecoveryLayout>
  );
}
