import { observer } from "mobx-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import Sidebar from "~/components/Sidebar/Sidebar";
import { DocsNavigation } from "~/components/Sidebar/DocsNavigation";
import { SidebarToggleIcon } from "@shared/components/LucideIcon";
import { CollapseButton } from "~/components/Sidebar/components/ToggleButton";
import SidebarButton from "~/components/Sidebar/components/SidebarButton";
import { LogIn, RotateCw } from "lucide-react";
import Tooltip from "~/components/Tooltip";
import useMobile from "~/hooks/useMobile";
import useStores from "~/hooks/useStores";
import { useWebsiteIdentity } from "~/components/WebsiteIdentityController";
import { websitePublicTranslation } from "~/utils/websitePublicTranslation";
import { PublicFeedback } from "./PublicFeedback";
import Button from "~/components/Button";

/** Adapts only public projections to shared navigation and the existing sidebar. */
export const PublicNavigation = observer(function PublicNavigation({
  recovery = false,
}: {
  recovery?: boolean;
}) {
  const { publicDocs, auth, ui } = useStores();
  const { t, i18n } = useTranslation();
  const { signIn, unavailable, configStatus, retry } = useWebsiteIdentity();
  const isMobile = useMobile();
  const navigation = publicDocs.navigation;
  const retryLabel = t(
    "Retry",
    websitePublicTranslation(i18n.language, "Retry", "重试")
  );
  return (
    <Sidebar showAccountMenu={!recovery && auth.authenticated}>
      <nav
        aria-label={t(
          "Documents navigation",
          websitePublicTranslation(
            i18n.language,
            "Documents navigation",
            "文档导航"
          )
        )}
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minHeight: 0,
        }}
      >
        <DocsNavigation
          homePath="/"
          searchPath="/search"
          view={{
            ...navigation,
            expandedIds: new Set(navigation.expandedIds),
            activeCollectionId: navigation.activeDocumentId
              ? undefined
              : navigation.activeCollectionId,
          }}
          onToggle={(id) => publicDocs.toggle(id)}
          scrollCollections
          brandActions={
            isMobile ? null : (
              <CollapseButton
                icon={<SidebarToggleIcon aria-hidden />}
                aria-label={
                  ui.sidebarIsClosed
                    ? t("Expand sidebar")
                    : t("Collapse sidebar")
                }
                aria-controls="sidebar"
                aria-expanded={!ui.sidebarIsClosed}
                onClick={() => ui.toggleCollapsedSidebar()}
              />
            )
          }
          renderCollectionStatus={(id) => {
            const tree = publicDocs.trees.get(id);
            return !tree || tree.status === "ready" ? null : (
              <PublicFeedback
                state={tree.status}
                reason={tree.reason}
                retry={() => {
                  void publicDocs.loadCollectionTree(id, true);
                }}
              />
            );
          }}
          afterCollections={
            <>
              {publicDocs.collections.status === "error" ? (
                <PublicFeedback
                  state="error"
                  reason={publicDocs.collections.reason}
                  retry={() => {
                    void publicDocs.loadNextCollections(true);
                  }}
                />
              ) : publicDocs.collections.status === "loading" ? (
                <PublicFeedback state="loading" />
              ) : null}
              {publicDocs.hasMoreCollections &&
              publicDocs.collections.status === "ready" ? (
                <Button
                  type="button"
                  onClick={() => {
                    void publicDocs.loadNextCollections();
                  }}
                >
                  {t(
                    "More collections",
                    websitePublicTranslation(
                      i18n.language,
                      "More collections",
                      "更多集合"
                    )
                  )}
                </Button>
              ) : null}
            </>
          }
          account={
            auth.authenticated ? (
              <Link to="/home">{t("Workspace")}</Link>
            ) : (
              <SidebarButton
                position="bottom"
                title={t("Login")}
                image={<LogIn size={18} aria-hidden />}
                onClick={signIn}
                disabled={auth.config?.initialized === false}
              >
                {!recovery && unavailable && configStatus === "ready" && (
                  <Tooltip content={retryLabel}>
                    <SidebarButton
                      position="bottom"
                      title=""
                      aria-label={retryLabel}
                      image={<RotateCw size={16} aria-hidden />}
                      onClick={retry}
                    />
                  </Tooltip>
                )}
              </SidebarButton>
            )
          }
        />
      </nav>
    </Sidebar>
  );
});
