import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import {
  SearchIcon,
  HomeIcon,
  CollectionIcon,
  DocumentIcon,
} from "@shared/components/LucideIcon";
import { websitePublicTranslation } from "~/utils/websitePublicTranslation";
import Scrollable from "~/components/Scrollable";
import Disclosure from "./components/Disclosure";
import { Header } from "./components/Header";
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
        {view.items.length > 0 && <Header title={t("Collections")} />}
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
  const hasDisclosure = item.kind === "collection" || item.children.length > 0;
  const active =
    item.kind === "collection"
      ? !view.activeDocumentId && view.activeCollectionId === item.id
      : view.activeDocumentId === item.id;
  const handleToggle = React.useCallback(
    () => onToggle(item.id),
    [item.id, onToggle]
  );

  return (
    <>
      <Row>
        {hasDisclosure && (
          <RowDisclosure
            $depth={depth}
            expanded={expanded}
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
          />
        )}
        <SidebarLink
          to={item.to}
          label={item.label}
          icon={
            <RowIcon $disclosure={hasDisclosure}>
              {item.kind === "collection" ? (
                <CollectionIcon aria-hidden />
              ) : (
                <DocumentIcon aria-hidden />
              )}
            </RowIcon>
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
            depth={
              item.kind === "collection" ? Math.max(depth + 1, 2) : depth + 1
            }
          />
        ))}
    </>
  );
}

const RowDisclosure = styled(Disclosure)<{ $depth: number }>`
  inset-inline-start: ${(props) =>
    `calc(${props.$depth * 16}px + ${props.$depth ? props.theme.exui.components.sidebarItem.nested.paddingInline : props.theme.exui.components.sidebarItem.default.paddingInline})`};
  top: 50%;
  transform: translateY(-50%);
  margin: 0;
  z-index: 1;
  opacity: 0;
  @media (hover: none) {
    opacity: 1;
  }
`;

const RowIcon = styled.span<{ $disclosure: boolean }>`
  display: inline-flex;
  width: inherit;
  height: inherit;
  > svg {
    width: inherit;
    height: inherit;
  }
  @media (hover: none) {
    opacity: ${(props) => (props.$disclosure ? 0 : 1)};
  }
`;

const Row = styled.div`
  position: relative;
  min-width: 0;
  &:hover,
  &:focus-within {
    ${RowDisclosure} {
      opacity: 1;
    }
    ${RowDisclosure} ~ a ${RowIcon} {
      opacity: 0;
    }
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
