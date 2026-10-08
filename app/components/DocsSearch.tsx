import * as React from "react";
import { DocumentIcon, SearchIcon } from "@shared/components/LucideIcon";
import { s, hover } from "@shared/styles";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import Button from "~/components/Button";

interface DocsSearchFormProps {
  label: string;
  query: string;
  onSearch: (query: string) => void;
  children?: React.ReactNode;
}

/**
 * Renders the shared search input and optional scoped filters.
 *
 * @param props label, query, submit callback, and filter controls.
 * @returns the search form.
 */
export function DocsSearchForm({
  label,
  query,
  onSearch,
  children,
}: DocsSearchFormProps) {
  const [value, setValue] = React.useState(query);
  React.useEffect(() => setValue(query), [query]);
  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        onSearch(value.trim());
      }}
    >
      <SearchLabel>
        {label}
        <SearchAdornment aria-hidden />
        <DocsSearchField
          type="search"
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
      </SearchLabel>
      <Button type="submit">{label}</Button>
      {children}
    </form>
  );
}

/** Shared input styling for public and member search. */
export const DocsSearchField = styled.input`
  width: 100%;
  height: ${(props) => props.theme.exui.components.formControl.base.height};
  box-sizing: border-box;
  padding-block: 6px;
  padding-inline: 40px 12px;
  font-size: 1rem;
  line-height: 24px;
  font-weight: ${(props) => props.theme.exui.typography.fontWeightRegular};
  outline: none;
  border: 0;
  background: ${s("inputBackground")};
  border-radius: 9999px;
  color: ${s("text")};
  &:focus-visible {
    box-shadow: ${(props) =>
      props.theme.exui.components.formControl.focus.shadow};
  }
  &::placeholder {
    color: ${(props) =>
      props.theme.exui.components.formControl.base.placeholder};
  }
`;

export interface DocsSearchResult {
  id: string;
  title: string;
  to: string;
  excerpt?: string;
}

interface DocsSearchResultListProps<T> {
  items: readonly T[];
  keyFor: (item: T) => string;
  renderResult: (item: T) => React.ReactNode;
}

/**
 * Presents search items through a caller-owned result renderer.
 *
 * @param props items, stable key selector, and capability-aware renderer.
 * @returns rendered search items with their original DOM hierarchy.
 */
export function DocsSearchResultList<T>({
  items,
  keyFor,
  renderResult,
}: DocsSearchResultListProps<T>) {
  return (
    <>
      {items.map((item) => (
        <React.Fragment key={keyFor(item)}>{renderResult(item)}</React.Fragment>
      ))}
    </>
  );
}

interface DocsSearchResultsProps {
  results: readonly DocsSearchResult[];
  renderResult?: (result: DocsSearchResult) => React.ReactNode;
  renderMetadata?: (result: DocsSearchResult) => React.ReactNode;
  emptyContent?: React.ReactNode;
}

/**
 * Renders projected search hits without requiring member-only metadata.
 *
 * @param props projected hits and optional member result renderer.
 * @returns the results list or empty content.
 */
export function DocsSearchResults({
  results,
  renderResult,
  renderMetadata,
  emptyContent,
}: DocsSearchResultsProps) {
  const { t } = useTranslation();
  if (results.length === 0) {
    return <>{emptyContent ?? <p>{t("No results")}</p>}</>;
  }
  return (
    <Results aria-label={t("Search Results")}>
      <DocsSearchResultList
        items={results}
        keyFor={(result) => result.id}
        renderResult={(result) => (
          <li key={result.id}>
            {renderResult ? (
              renderResult(result)
            ) : (
              <DocsSearchResultLink to={result.to} aria-label={result.title}>
                <ResultIcon aria-hidden />
                <DocsSearchResultContent
                  title={result.title}
                  excerpt={result.excerpt}
                  metadata={renderMetadata?.(result)}
                />
              </DocsSearchResultLink>
            )}
          </li>
        )}
      />
    </Results>
  );
}

interface DocsSearchResultContentProps {
  title: React.ReactNode;
  excerpt?: React.ReactNode;
  metadata?: React.ReactNode;
  titleActions?: React.ReactNode;
  dir?: string;
}

/**
 * Presents result text with caller-owned highlighting and authorized metadata.
 *
 * @param props title, excerpt, and optional capability slots.
 * @returns the shared static result content.
 */
export function DocsSearchResultContent({
  title,
  excerpt,
  metadata,
  titleActions,
  dir,
}: DocsSearchResultContentProps) {
  return (
    <ResultContent>
      <ResultHeading dir={dir}>
        <ResultTitle>{title}</ResultTitle>
        {titleActions}
      </ResultHeading>
      {excerpt && <ResultExcerpt>{excerpt}</ResultExcerpt>}
      {metadata}
    </ResultContent>
  );
}

/** Shared static result row; adapters own selection, drag, and menu behavior. */
export const DocsSearchResultLink = styled(Link)`
  display: flex;
  align-items: center;
  margin: 10px -8px;
  padding: 6px 8px;
  border-radius: ${(props) => props.theme.exui.components.sidebarItem.default.radius};
  max-height: 50vh;
  width: calc(100vw - 8px);
  cursor: var(--pointer);
  &:focus-visible {
    outline: none;
    box-shadow: ${(props) => props.theme.exui.shadow.focus};
  }
  &:${hover}, &:active, &:focus, &:focus-within {
    background: ${s("listItemHoverBackground")};
  }
  ${breakpoint("tablet")`
    width: auto;
  `};
`;

const ResultIcon = styled(DocumentIcon)`
  align-self: flex-start;
  flex-shrink: 0;
  margin-inline-end: 4px;
  color: ${s("textSecondary")};
`;

const ResultContent = styled.div`
  flex-grow: 1;
  flex-shrink: 1;
  min-width: 0;
`;

const ResultHeading = styled.span`
  display: flex;
  align-items: center;
  margin-top: 0;
  margin-bottom: 0.1em;
  white-space: nowrap;
  color: ${s("text")};
  font-family: ${(props) => props.theme.exui.typography.fontFamily};
  font-weight: ${(props) => props.theme.exui.typography.fontWeightMedium};
  font-size: 1.125rem;
  line-height: 1.2;
  gap: 4px;
`;

const ResultTitle = styled.span`
  max-width: 90%;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ResultExcerpt = styled.span`
  display: block;
  color: ${s("textSecondary")};
  font-size: ${(props) => props.theme.exui.typography.bodyFontSize};
  margin-top: -0.25em;
  margin-bottom: 0.25em;
  max-height: 90px;
  overflow: hidden;
`;

const SearchLabel = styled.label`
  display: block;
  position: relative;
  ${DocsSearchField} {
    margin-top: 0.5rem;
  }
`;

const SearchAdornment = styled(SearchIcon)`
  position: absolute;
  inset-inline-start: 12px;
  bottom: 9px;
  color: ${s("textSecondary")};
`;

const Results = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  li {
    margin: 0;
  }
`;
