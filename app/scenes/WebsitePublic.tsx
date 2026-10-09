import { useEffect } from "react";
import { observer } from "mobx-react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { DocsLayout } from "~/components/DocsLayout";
import Header from "~/components/Header";
import Flex from "~/components/Flex";
import { DocsStatus } from "~/components/DocsStatus";
import { useWebsiteIdentity } from "~/components/WebsiteIdentityController";
import useStores from "~/hooks/useStores";
import { websitePublicTranslation } from "~/utils/websitePublicTranslation";
import { PublicDirectory } from "./WebsitePublic/PublicDirectory";
import { PublicDocumentView } from "./WebsitePublic/PublicDocument";
import { PublicNavigation } from "./WebsitePublic/PublicNavigation";
import { PublicSearch } from "./WebsitePublic/PublicSearch";
import { PublicReadingNavigation } from "./WebsitePublic/PublicReadingNavigation";

export { PublicDocumentView } from "./WebsitePublic/PublicDocument";

/** Composes public adapters into the same shell used by the authorized workspace. */
export function WebsitePublic({
  kind,
}: {
  kind: "directory" | "document" | "search";
}) {
  const { t, i18n } = useTranslation();
  const { auth, publicDocs } = useStores();
  const { configStatus, retry } = useWebsiteIdentity();
  const location = useLocation();
  const generation = publicDocs.generation;
  const initialized = auth.websiteIntegrationInitialized;
  useEffect(() => {
    if (initialized) {
      void publicDocs.ensureCollections();
    }
  }, [publicDocs, initialized, generation]);
  useEffect(
    () => () => publicDocs.leaveRoute(),
    [publicDocs, location.pathname]
  );
  return (
    <DocsLayout title={t("Documents")} sidebar={<PublicNavigation />}>
      <Flex column auto>
        {(!initialized || configStatus !== "ready") && (
          <Header
            hasSidebar
            title={t("Documents")}
            left={<PublicReadingNavigation />}
          />
        )}
        {configStatus !== "ready" ? (
          <DocsStatus
            layout="page"
            state={configStatus === "loading" ? "loading" : "error"}
            title={t("Documents")}
            content={
              configStatus === "loading"
                ? t("Loading")
                : t(
                    "Documents are unavailable. Try again.",
                    websitePublicTranslation(
                      i18n.language,
                      "Documents are unavailable. Try again.",
                      "暂时无法加载文档，请重试。"
                    )
                  )
            }
            onRetry={configStatus === "error" ? retry : undefined}
          />
        ) : !initialized ? (
          <DocsStatus
            layout="page"
            state="unavailable"
            title={t("Documents")}
            content={t(
              "The document library is not initialized yet.",
              websitePublicTranslation(
                i18n.language,
                "The document library is not initialized yet.",
                "文档库尚未初始化。"
              )
            )}
          />
        ) : kind === "directory" ? (
          <PublicDirectory />
        ) : kind === "document" ? (
          <PublicDocumentView />
        ) : (
          <PublicSearch />
        )}
      </Flex>
    </DocsLayout>
  );
}
export default observer(WebsitePublic);
