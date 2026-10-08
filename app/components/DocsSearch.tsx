import * as React from "react";
import { DocumentIcon, SearchIcon } from "@shared/components/LucideIcon";
import { s, hover } from "@shared/styles";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import Flex from "~/components/Flex";
import Text from "~/components/Text";
import { HStack } from "~/components/primitives/HStack";

interface DocsSearchFormProps {
  label: string;
  query: string;
  onSearch: (query: string) => void;
  placeholder?: string;
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
  placeholder,
  children,
}: DocsSearchFormProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        onSearch(inputRef.current?.value.trim() ?? "");
      }}
    >
      <DocsSearchInput
        key={query}
        ref={inputRef}
        name="query"
        aria-label={label}
        placeholder={placeholder ?? `${label}…`}
        defaultValue={query}
        onKeyDown={(event) => {
          if (event.key === "Enter" && event.nativeEvent.isComposing) {
            event.preventDefault();
          }
        }}
      />
      {children}
    </form>
  );
}

/** Shared member search input, including its focus and search icon behavior. */
export const DocsSearchInput = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & { defaultValue: string }
>(function DocsSearchInput({ defaultValue, ...rest }, forwardedRef) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const handleRef = React.useCallback(
    (input: HTMLInputElement | null) => {
      inputRef.current = input;
      if (typeof forwardedRef === "function") {
        forwardedRef(input);
      } else if (forwardedRef) {
        forwardedRef.current = input;
      }
    },
    [forwardedRef]
  );
  React.useEffect(() => {
    const length = defaultValue.length;
    inputRef.current?.setSelectionRange(length, length);
    const timeout = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(timeout);
  }, [defaultValue]);
  return (
    <SearchInputWrapper align="center">
      <SearchAdornment aria-hidden onClick={() => inputRef.current?.focus()} />
      <NativeSearchInput
        {...rest}
        defaultValue={defaultValue}
        ref={handleRef}
        spellCheck="false"
        type="search"
        autoFocus
      />
    </SearchInputWrapper>
  );
});

/** Shared quiet empty state for public and member searches. */
export function DocsSearchEmpty({ embedded = false }: { embedded?: boolean }) {
  const { t } = useTranslation();
  return (
    <DocsSearchCentered $embedded={embedded} column role="status">
      <Text as="p" type="secondary">
        {t("No documents found for your search filters.")}
      </Text>
    </DocsSearchCentered>
  );
}

/** Shared placement of the search controls in a page or embedded dialog. */
export const DocsSearchWrapper = styled(Flex)<{ $embedded: boolean }>`
  ${breakpoint("tablet")`
    margin-top: ${(props: { $embedded: boolean }) =>
      props.$embedded ? "0" : "40px"};
  `};
`;

/** Shared centered layout for search feedback. */
export const DocsSearchCentered = styled(Flex)<{ $embedded: boolean }>`
  text-align: center;
  margin: ${(props) => (props.$embedded ? "48px auto" : "30vh auto 0")};
  max-width: 380px;
  transform: ${(props) => (props.$embedded ? "none" : "translateY(-50%)")};
`;

/** Shared responsive row for caller-owned authorized search filters. */
export const DocsSearchFilters = styled(HStack)`
  flex-wrap: wrap;
  justify-content: space-between;
  margin-bottom: 12px;
  transition: opacity 100ms ease-in-out;
  padding: 8px 0;
  ${breakpoint("tablet")`
    padding: 0;
  `};
`;

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

const SearchInputWrapper = styled(Flex)`
  position: relative;
  margin-bottom: 8px;
`;

const NativeSearchInput = styled(DocsSearchField)`
  ::-webkit-search-cancel-button {
    -webkit-appearance: none;
  }
`;

const SearchAdornment = styled(SearchIcon)`
  position: absolute;
  inset-inline-start: 12px;
  color: ${s("placeholder")};
`;

const Results = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  ${DocsSearchResultLink} {
    width: auto;
  }
  li {
    margin: 0;
  }
`;
