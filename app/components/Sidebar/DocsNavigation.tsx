import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import {
  SearchIcon,
  HomeIcon,
  CollectionIcon,
  DocumentIcon,
} from "@shared/components/LucideIcon";
import { ChevronDown, ChevronRight } from "lucide-react";
import { s } from "@shared/styles";
import { websitePublicTranslation } from "~/utils/websitePublicTranslation";
import Scrollable from "~/components/Scrollable";
import Section from "./components/Section";
import SidebarLink from "./components/SidebarLink";
import { SidebarBrand } from "./components/SidebarBrand";

export interface DocsNavigationItem {
  id: string;
  kind: "collection" | "document";
  label: string;
  to: string;
  children: readonly DocsNavigationItem[];
}

export interface DocsNavigationView {
  items: readonly DocsNavigationItem[];
  activeCollectionId?: string;
  activeDocumentId?: string;
  expandedIds: ReadonlySet<string>;
}

interface DocsNavigationProps {
  homePath: string;
  searchPath: string;
  view: DocsNavigationView;
  onToggle: (id: string) => void;
  /** Renders adapter-owned loading, error, or retry controls for an expanded collection. */
  renderCollectionStatus?: (collectionId: string) => React.ReactNode;
  brandActions?: React.ReactNode;
  quickActions?: React.ReactNode;
  beforeCollections?: React.ReactNode;
  afterCollections?: React.ReactNode;
  account?: React.ReactNode;
  /** Keeps large public trees scrollable while the account region remains reachable. */
  scrollCollections?: boolean;
  onSearchClick?: () => void;
  onHomeClickIntent?: React.MouseEventHandler<HTMLElement>;
  onSearchClickIntent?: React.MouseEventHandler<HTMLElement>;
}

/**
 * Renders document navigation using identity-free view data and protected slots.
 *
 * @param props static navigation data, callbacks, and optional member content.
 * @returns the shared navigation sections.
 */
export function DocsNavigation({
  homePath,
  searchPath,
  view,
  onToggle,
  renderCollectionStatus,
  brandActions,
  quickActions,
  beforeCollections,
  afterCollections,
  account,
  scrollCollections = false,
  onSearchClick,
  onHomeClickIntent,
  onSearchClickIntent,
}: DocsNavigationProps) {
  const { t } = useTranslation();
  const collections = (
    <>
      {beforeCollections}
      <Section aria-label={t("Collections")}>
        {view.items.map((item) => (
          <NavigationRow
            key={item.id}
            item={item}
            view={view}
            onToggle={onToggle}
            renderCollectionStatus={renderCollectionStatus}
            depth={0}
          />
        ))}
      </Section>
      {afterCollections}
    </>
  );
  return (
    <>
      <SidebarBrand>{brandActions}</SidebarBrand>
      <Section>
        <SidebarLink
          to={homePath}
          icon={<HomeIcon />}
          exact={homePath === "/"}
          label={t("Home")}
          onClickIntent={onHomeClickIntent}
        />
        <SidebarLink
          to={searchPath}
          icon={<SearchIcon />}
          exact={false}
          label={t("Search")}
          onClick={onSearchClick}
          onClickIntent={onSearchClickIntent}
        />
        {quickActions}
      </Section>
      {scrollCollections ? (
        <NavigationScrollable
          role="region"
          aria-label={t("Collections")}
          shadow
        >
          {collections}
        </NavigationScrollable>
      ) : (
        collections
      )}
      {account && <Account>{account}</Account>}
    </>
  );
}

interface NavigationRowProps {
  item: DocsNavigationItem;
  view: DocsNavigationView;
  onToggle: (id: string) => void;
  renderCollectionStatus?: (collectionId: string) => React.ReactNode;
  depth: number;
}

function NavigationRow({
  item,
  view,
  onToggle,
  renderCollectionStatus,
  depth,
}: NavigationRowProps) {
  const { t, i18n } = useTranslation();
  const expanded = view.expandedIds.has(item.id);
  const active =
    item.kind === "collection"
      ? view.activeCollectionId === item.id
      : view.activeDocumentId === item.id;
  const handleToggle = React.useCallback(
    () => onToggle(item.id),
    [item.id, onToggle]
  );

  return (
    <>
      <Row>
        {(item.kind === "collection" || item.children.length > 0) && (
          <Disclosure
            type="button"
            aria-label={`${
              expanded
                ? t(
                    "Collapse",
                    websitePublicTranslation(i18n.language, "Collapse", "折叠")
                  )
                : t(
                    "Expand",
                    websitePublicTranslation(i18n.language, "Expand", "展开")
                  )
            } ${item.label}`}
            aria-expanded={expanded}
            onClick={handleToggle}
          >
            {expanded ? (
              <ChevronDown size={16} aria-hidden />
            ) : (
              <ChevronRight size={16} aria-hidden />
            )}
          </Disclosure>
        )}
        <SidebarLink
          to={item.to}
          label={item.label}
          icon={
            item.kind === "collection" ? (
              <CollectionIcon aria-hidden />
            ) : (
              <DocumentIcon aria-hidden />
            )
          }
          depth={depth}
          active={active}
          aria-current={active ? "page" : undefined}
        />
      </Row>
      {expanded &&
        item.kind === "collection" &&
        renderCollectionStatus?.(item.id)}
      {expanded &&
        item.children.map((child) => (
          <NavigationRow
            key={child.id}
            item={child}
            view={view}
            onToggle={onToggle}
            renderCollectionStatus={renderCollectionStatus}
            depth={depth + 1}
          />
        ))}
    </>
  );
}

const Row = styled.div`
  display: flex;
  align-items: center;
  position: relative;
  min-width: 0;
`;

const Disclosure = styled.button`
  flex: none;
  border: 0;
  background: transparent;
  color: ${s("textSecondary")};
  cursor: pointer;
  width: 24px;
  height: 28px;
  &:focus-visible {
    outline: 2px solid ${s("accent")};
  }
`;

const Account = styled.div`
  margin: auto 8px 8px;
  flex-shrink: 0;
`;

const NavigationScrollable = styled(Scrollable)`
  flex: 1;
  min-height: 0;
  height: auto;
`;
