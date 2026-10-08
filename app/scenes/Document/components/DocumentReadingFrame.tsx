import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import styled, { css } from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { exuiTokens } from "@exre/exui/tokens";
import { MenuIcon } from "@shared/components/LucideIcon";
import { EditorStyleHelper } from "@shared/editor/styles/EditorStyleHelper";
import { s } from "@shared/styles";
import { light } from "@shared/styles/theme";
import { TOCPosition } from "@shared/types";
import Button from "~/components/Button";

export interface ReadingHeading {
  id: string;
  level: number;
  title: string;
  label?: string;
}

interface DocumentReadingFrameProps {
  title: string;
  breadcrumb?: ReactNode;
  editor: ReactNode;
  actions?: ReactNode;
  headings?: readonly ReadingHeading[];
  navigateHeading?: (id: string) => void;
  fullWidth?: boolean;
  tocPosition?: TOCPosition | false;
  showContents?: boolean;
  onToggleContents?: () => void;
  ready?: boolean;
}

/**
 * Renders the shared reading geometry and static document content.
 *
 * @param props title, content, actions, and optional contents navigation.
 * @returns an identity-free document reading surface.
 */
export function DocumentReadingFrame({
  title,
  breadcrumb,
  editor,
  actions,
  headings = [],
  navigateHeading,
  fullWidth = false,
  tocPosition = TOCPosition.Right,
  showContents = true,
  onToggleContents,
  ready = true,
}: DocumentReadingFrameProps) {
  const { t } = useTranslation();
  const [localContents, setLocalContents] = useState(true);
  const contentsAvailable =
    tocPosition !== false &&
    headings.some((heading) => heading.level <= 4) &&
    !!navigateHeading;
  const hasContents =
    contentsAvailable &&
    showContents &&
    (onToggleContents ? true : localContents);
  return (
    <ReadingArticle aria-label={title}>
      <ReadingMain fullWidth={fullWidth} tocPosition={tocPosition}>
        <ReadingBody
          docFullWidth={fullWidth}
          showContents={hasContents}
          tocPosition={tocPosition}
        >
          {breadcrumb && <Breadcrumb>{breadcrumb}</Breadcrumb>}
          <Header>
            <ReadingTitle
              tabIndex={-1}
              data-docs-focus={ready ? "true" : "false"}
            >
              {title}
            </ReadingTitle>
            {contentsAvailable && (
              <Button
                type="button"
                neutral
                icon={<MenuIcon aria-hidden />}
                aria-expanded={hasContents}
                aria-controls="docs-reading-contents"
                onClick={
                  onToggleContents ??
                  (() => setLocalContents((visible) => !visible))
                }
              >
                {t("Contents")}
              </Button>
            )}
            {actions}
          </Header>
          {editor}
        </ReadingBody>
        {hasContents && (
          <PublicReadingContents
            docFullWidth={fullWidth}
            position={tocPosition}
            id="docs-reading-contents"
          >
            <ReadingContentsView
              headings={headings}
              navigateHeading={navigateHeading}
              title={t("Contents")}
              mobileVisible
            />
          </PublicReadingContents>
        )}
      </ReadingMain>
    </ReadingArticle>
  );
}

interface ReadingContentsViewProps {
  headings: readonly ReadingHeading[];
  activeHeading?: string;
  navigateHeading?: (id: string) => void;
  headingTitle?: (heading: ReadingHeading) => ReactNode;
  onItemRef?: (id: string, element: HTMLLIElement | null) => void;
  title?: string;
  mobileVisible?: boolean;
}

/**
 * Renders a contents list from published headings without document models.
 *
 * @param props headings, active heading, and navigation callback.
 * @returns the shared contents list.
 */
export function ReadingContentsView({
  headings,
  activeHeading,
  navigateHeading,
  headingTitle,
  onItemRef,
  title = "Contents",
  mobileVisible = false,
}: ReadingContentsViewProps) {
  const visible = headings.filter((heading) => heading.level <= 4);
  if (visible.length === 0) {
    return <ContentsPanel />;
  }
  const minLevel = Math.min(...visible.map((heading) => heading.level));
  return (
    <ContentsPanel aria-label={title} $mobileVisible={mobileVisible}>
      <ContentsHeading>
        <MenuIcon size={16} aria-hidden />
        {title}
      </ContentsHeading>
      <ContentsList>
        {visible.map((heading) => (
          <ContentsItem
            key={heading.id}
            ref={(element) => onItemRef?.(heading.id, element)}
            $depth={heading.level - minLevel}
          >
            <ContentsLink
              href={`#${heading.id}`}
              aria-current={
                activeHeading === heading.id ? "location" : undefined
              }
              onClick={(event) => {
                if (
                  !navigateHeading ||
                  event.button !== 0 ||
                  event.metaKey ||
                  event.ctrlKey ||
                  event.shiftKey ||
                  event.altKey
                ) {
                  return;
                }
                event.preventDefault();
                navigateHeading(heading.id);
              }}
            >
              {heading.label && <span>{heading.label} </span>}
              {headingTitle ? headingTitle(heading) : heading.title}
            </ContentsLink>
          </ContentsItem>
        ))}
      </ContentsList>
    </ContentsPanel>
  );
}

const ReadingArticle = styled.article`
  width: 100%;
  min-width: 0;
  color: ${s("text")};
`;

const Breadcrumb = styled.nav`
  padding-top: 16px;
  color: ${s("textSecondary")};
`;

const Header = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

/** Static document title typography shared by editable and public titles. */
export const readingTitleStyles = css`
  position: relative;
  line-height: 1.25;
  margin-top: 8vh;
  margin-bottom: 0.5em;
  font-size: 2.25em;
  font-weight: 600;
  border: 0;
  padding: 0;
  ${breakpoint("tablet")`
    margin-top: 6vh;
    margin-left: 0;
  `}
  @media print {
    color: ${light.text};
    -webkit-text-fill-color: ${light.text};
    background: none;
  }
`;

/** Focusable static heading for an identity-free document reader. */
export const ReadingTitle = styled.h1`
  ${readingTitleStyles}
  min-width: 0;
  word-break: anywhere;
`;

export interface ReadingMainProps {
  fullWidth: boolean;
  tocPosition: TOCPosition | false;
}

/** Shared document grid for member and public readers. */
export const ReadingMain = styled.div<ReadingMainProps>`
  margin-top: 4px;
  ${breakpoint("tablet")`
    display: grid;
    grid-template-columns: ${({ fullWidth, tocPosition }: ReadingMainProps) =>
      fullWidth
        ? tocPosition === TOCPosition.Left
          ? `${EditorStyleHelper.tocWidth}px minmax(0, 1fr)`
          : `minmax(0, 1fr) ${EditorStyleHelper.tocWidth}px`
        : `1fr minmax(0, ${`calc(46em + ${EditorStyleHelper.documentGutter})`}) 1fr`};
  `};
  ${breakpoint("desktopLarge")`
    grid-template-columns: ${({ fullWidth, tocPosition }: ReadingMainProps) =>
      fullWidth
        ? tocPosition === TOCPosition.Left
          ? `${EditorStyleHelper.tocWidth}px minmax(0, 1fr)`
          : `minmax(0, 1fr) ${EditorStyleHelper.tocWidth}px`
        : `1fr minmax(0, ${`calc(${EditorStyleHelper.documentWidth} + ${EditorStyleHelper.documentGutter})`}) 1fr`};
  `};
  @media print {
    display: block;
    max-width: ${({ fullWidth }: ReadingMainProps) =>
      fullWidth
        ? "100%"
        : `calc(${EditorStyleHelper.documentWidth} + ${EditorStyleHelper.documentGutter})`};
  }
`;

export interface ReadingBodyProps {
  docFullWidth: boolean;
  showContents: boolean;
  tocPosition: TOCPosition | false;
}

/** Shared page padding and reading column for member and public readers. */
export const ReadingBody = styled.div<ReadingBodyProps>`
  padding: 0 32px;
  ${breakpoint("tablet")`
    padding: 0 44px;
    grid-row: 1;
    grid-column: ${({
      docFullWidth,
      showContents,
      tocPosition,
    }: ReadingBodyProps) =>
      docFullWidth
        ? showContents
          ? tocPosition === TOCPosition.Left
            ? 2
            : 1
          : "1 / -1"
        : 2};
  `};
`;

export interface ReadingContentsProps {
  docFullWidth: boolean;
  position: TOCPosition | false;
}

/** Shared table of contents column. */
export const ReadingContents = styled.div<ReadingContentsProps>`
  ${breakpoint("tablet")`
    margin-top: calc(44px + 6vh);
    grid-row: 1;
    grid-column: ${({ docFullWidth, position }: ReadingContentsProps) =>
      position === TOCPosition.Left ? 1 : docFullWidth ? 2 : 3};
    justify-self: ${({ position }: ReadingContentsProps) =>
      position === TOCPosition.Left ? "end" : "start"};
  `};
  @media print {
    display: none;
  }
`;

/** Shared print-only contents position. */
export const ReadingPrintContents = styled.div`
  display: none;
  margin: 0 -12px;
  @media print {
    display: block;
  }
`;

const PublicReadingContents = styled(ReadingContents)`
  padding: 0 32px 24px;
  ${breakpoint("tablet")`
    padding: 0;
  `};
  @media print {
    display: block;
  }
`;

const ContentsPanel = styled.nav<{ $mobileVisible?: boolean }>`
  display: none;
  position: sticky;
  top: 90px;
  max-height: calc(100vh - 90px);
  width: ${EditorStyleHelper.tocWidth}px;
  padding: 0 16px;
  overflow-y: auto;
  border-radius: ${(props) => props.theme.exui.radii.extraLarge};
  background: ${s("background")};
  ${breakpoint("tablet")`
    display: block;
  `};
  ${({ $mobileVisible }) =>
    $mobileVisible &&
    css`
      display: block;
      position: static;
      width: 100%;
      max-height: none;
      padding: 0;
      ${breakpoint("tablet")`
      position: sticky;
      top: 90px;
      max-height: calc(100vh - 90px);
      width: ${EditorStyleHelper.tocWidth}px;
      padding: 0 16px;
    `};
      @media print {
        position: static;
        max-height: none;
      }
    `}
`;

const ContentsHeading = styled.h3`
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: ${exuiTokens.typography.smallFontSize};
  color: ${s("textTertiary")};
`;

const ContentsList = styled.ol`
  padding: 0;
  list-style: none;
`;

const ContentsItem = styled.li<{ $depth: number }>`
  margin-inline-start: ${(props) => props.$depth * 10}px;
  margin-bottom: 8px;
`;

const ContentsLink = styled.a`
  color: ${s("text")};
  font-size: ${exuiTokens.typography.bodyFontSize};
  &:hover,
  &[aria-current] {
    color: ${s("accent")};
  }
`;
