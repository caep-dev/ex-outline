import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import styled from "styled-components";
import {
  CollectionIcon,
  HomeIcon,
  SearchIcon,
} from "@shared/components/LucideIcon";
import Button from "~/components/Button";
import { GlassNavigationToolbar } from "~/components/GlassToolbar";

interface PublicReadingNavigationProps {
  collection?: { name: string; url: string };
  searchPath?: string;
  children?: ReactNode;
}

/** Composes safe public destinations and caller-owned controls in the shared glass toolbar. */
export function PublicReadingNavigation({
  collection,
  searchPath,
  children,
}: PublicReadingNavigationProps) {
  const { t } = useTranslation();
  return (
    <Navigation data-public-reading-toolbar aria-label={t("Documents")}>
      <Button
        as={Link}
        to={collection?.url ?? "/"}
        icon={
          collection ? <CollectionIcon aria-hidden /> : <HomeIcon aria-hidden />
        }
        data-slot="action-button"
        data-public-reading-destination
        title={collection?.name ?? t("Collections")}
        neutral
        borderOnHover
      >
        {collection?.name ?? t("Collections")}
      </Button>
      {searchPath && (
        <Button
          as={Link}
          to={searchPath}
          icon={<SearchIcon aria-hidden />}
          data-slot="action-button"
          aria-label={t("Search")}
          neutral
          borderOnHover
        />
      )}
      {children}
    </Navigation>
  );
}

const Navigation = styled(GlassNavigationToolbar)`
  @media print {
    display: none;
  }
  [data-public-reading-destination] {
    flex-shrink: 1;
    min-width: 0;
    > span {
      min-width: 0;
    }
  }
`;
