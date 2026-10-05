import { observer } from "mobx-react";
/**
 *
 * OUTLINE ICON BLOCK
 *
 * import { SearchIcon, HomeIcon, SidebarIcon } from "outline-icons";
 */
import {
  SearchIcon,
  HomeIcon,
  SidebarToggleIcon,
} from "@shared/components/LucideIcon";
import { useEffect, useState, useCallback, useRef } from "react";
import {
  DragActiveProvider,
  SidebarScrollProvider,
} from "./components/DragActiveContext";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import styled from "styled-components";
import { SidebarSection, UserPreference } from "@shared/types";
import { metaDisplay } from "@shared/utils/keyboard";
import Scrollable from "~/components/Scrollable";
import { navigateToImport } from "~/actions/definitions/navigation";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import useCurrentUser from "~/hooks/useCurrentUser";
import usePolicy from "~/hooks/usePolicy";
import useStores from "~/hooks/useStores";
import * as Scenes from "~/routes/scenes";
import { homePath, searchPath } from "~/utils/routeHelpers";
import Tooltip from "../Tooltip";
import Sidebar from "./Sidebar";
import ArchiveLink from "./components/ArchiveLink";
import Collections from "./components/Collections";
import DraggableSection, {
  normalizeSidebarSectionOrder,
} from "./components/DraggableSection";
import { DraftsLink } from "./components/DraftsLink";
import DragPlaceholder from "./components/DragPlaceholder";
import { DismissableSidebarAction } from "./components/DismissableSidebarAction";
import HistoryNavigation from "./components/HistoryNavigation";
import Section from "./components/Section";
import SharedWithMe from "./components/SharedWithMe";
import { SidebarBrand } from "./components/SidebarBrand";
import SidebarLink from "./components/SidebarLink";
import Starred from "./components/Starred";
import ToggleButton from "./components/ToggleButton";
import TrashLink from "./components/TrashLink";
import useMobile from "~/hooks/useMobile";

function AppSidebar() {
  const { t } = useTranslation();
  const { auth, documents, ui, collections, policies } = useStores();
  const team = useCurrentTeam();
  const user = useCurrentUser();
  const can = usePolicy(team);
  const canCreateAny = auth.websiteIntegrationEnabled
    ? collections.allActive.some(
        (collection) => policies.abilities(collection.id).createDocument
      )
    : can.createDocument;
  const history = useHistory();
  const isMobile = useMobile();

  const handleSearchClick = useCallback(() => {
    const basePath = searchPath();
    const { pathname, search } = history.location;
    if (pathname.startsWith(basePath) && (search || pathname !== basePath)) {
      history.push(basePath);
    }
  }, [history]);

  useEffect(() => {
    void collections.fetchAll();

    if (auth.websiteIntegrationEnabled ? canCreateAny : !user.isViewer) {
      void documents.fetchDrafts();
    }
  }, [
    documents,
    collections,
    user.isViewer,
    auth.websiteIntegrationEnabled,
    canCreateAny,
  ]);

  // Scrollable reads ref.current internally for its shadow/ResizeObserver
  // logic, so we must pass an object ref — a callback ref would leave those
  // reads undefined. We mirror the attached node into state so the
  // SidebarScrollProvider can re-render descendants with the scroll element.
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollArea, setScrollArea] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setScrollArea(scrollRef.current);
  }, []);

  const sectionOrder = normalizeSidebarSectionOrder(
    user.getPreference(UserPreference.SidebarSectionOrder, [])
  );

  const sectionContent = {
    [SidebarSection.Starred]: <Starred />,
    [SidebarSection.SharedWithMe]: <SharedWithMe />,
    [SidebarSection.Collections]: <Collections />,
  };

  return (
    <Sidebar hidden={!ui.readyToShow}>
      <DragActiveProvider>
        <DragPlaceholder />

        <SidebarBrand>
          {isMobile ? null : (
            <Tooltip
              content={t("Toggle sidebar")}
              shortcut={`${metaDisplay}+.`}
            >
              <CollapseButton
                icon={<SidebarToggleIcon aria-hidden />}
                aria-label={
                  ui.sidebarCollapsed
                    ? t("Expand sidebar")
                    : t("Collapse sidebar")
                }
                aria-controls="sidebar"
                aria-expanded={!ui.sidebarIsClosed}
                onClick={() => {
                  ui.toggleCollapsedSidebar();
                  (document.activeElement as HTMLElement)?.blur();
                }}
              />
            </Tooltip>
          )}
        </SidebarBrand>
        <Overflow>
          <Section>
            <SidebarLink
              to={homePath()}
              icon={<HomeIcon />}
              exact={false}
              label={t("Home")}
              onClickIntent={Scenes.Home.preload}
            />
            <SidebarLink
              to={searchPath()}
              icon={<SearchIcon />}
              label={t("Search")}
              exact={false}
              onClick={handleSearchClick}
              onClickIntent={Scenes.Search.preload}
            />
            {canCreateAny && <DraftsLink />}
          </Section>
        </Overflow>
        <SidebarScrollable flex shadow ref={scrollRef}>
          <SidebarScrollProvider value={scrollArea}>
            {sectionOrder.map((section) => (
              <DraggableSection key={section} section={section}>
                {sectionContent[section]}
              </DraggableSection>
            ))}
          </SidebarScrollProvider>
        </SidebarScrollable>
        <Section>
          <DismissableSidebarAction
            id="sidebar-import-hidden"
            action={navigateToImport}
          />
          {can.createDocument && (
            <>
              <ArchiveArea>
                <ArchiveLink />
              </ArchiveArea>
              <TrashLink />
            </>
          )}
        </Section>
      </DragActiveProvider>
      <HistoryNavigation />
    </Sidebar>
  );
}

const Overflow = styled.div`
  overflow: hidden;
  flex-shrink: 0;
`;

const SidebarScrollable = styled(Scrollable)`
  flex: 1;
  min-height: 0;
  height: auto;
`;

const ArchiveArea = styled.div`
  max-height: 35vh;
  overflow-y: auto;
  overscroll-behavior: contain;
`;

const CollapseButton = styled(ToggleButton)`
  &:not(:hover):not(:focus-visible):not(:active) {
    background: transparent;
    border-color: transparent;
    box-shadow: none;
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
  }
`;

export default observer(AppSidebar);
