import { useEffect } from "react";
import { observer } from "mobx-react";
import { useTranslation } from "react-i18next";
import { useHistory, useLocation } from "react-router-dom";
import { DocsSearchForm, DocsSearchResults } from "~/components/DocsSearch";
import { DocsStatus } from "~/components/DocsStatus";
import Button from "~/components/Button";
import { DocumentReadingFrame } from "~/scenes/Document/components/DocumentReadingFrame";
import useStores from "~/hooks/useStores";
import { websitePublicTranslation } from "~/utils/websitePublicTranslation";
import { PublicFeedback } from "./PublicFeedback";

/** Reads public search scope and presents projected hits through the shared search components. */
export const PublicSearch = observer(function PublicSearch() {
  const { publicDocs } = useStores();
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const history = useHistory();
  const params = new URLSearchParams(location.search);
  const query = params.get("q")?.trim() ?? "";
  const collectionId = params.get("collectionId") ?? undefined;
  const generation = publicDocs.generation;
  useEffect(() => {
    void publicDocs.search(query, collectionId);
  }, [publicDocs, query, collectionId, generation]);
  const ready =
    publicDocs.searchQuery === query &&
    publicDocs.searchCollectionId === collectionId &&
    publicDocs.searchResults.status === "ready";
  return (
    <DocumentReadingFrame
      title={t("Search")}
      ready={!query || ready}
      editor={
        <>
          <DocsSearchForm
            label={t(
              "Search public documents",
              websitePublicTranslation(
                i18n.language,
                "Search public documents",
                "搜索公开文档"
              )
            )}
            query={query}
            onSearch={(value) => {
              const next = new URLSearchParams(location.search);
              if (value) {
                next.set("q", value);
              } else {
                next.delete("q");
              }
              history.push({ pathname: "/search", search: next.toString() });
            }}
          />
          {!query ? (
            <DocsStatus
              state="empty"
              title={t("Search")}
              content={t(
                "Enter a search term.",
                websitePublicTranslation(
                  i18n.language,
                  "Enter a search term.",
                  "请输入搜索词。"
                )
              )}
            />
          ) : !ready ? (
            <PublicFeedback
              state={
                publicDocs.searchQuery === query
                  ? publicDocs.searchResults.status
                  : "loading"
              }
              reason={publicDocs.searchResults.reason}
              retry={() => {
                void publicDocs.search(query, collectionId);
              }}
            />
          ) : (
            <DocsSearchResults
              results={(publicDocs.searchResults.data ?? []).map((item) => ({
                id: item.id,
                title: item.title,
                to: item.url,
                excerpt: item.excerpt,
              }))}
              emptyContent={
                <DocsStatus
                  state="empty"
                  title={t("Search")}
                  content={t("No results")}
                />
              }
            />
          )}
          {ready && publicDocs.hasMoreSearch && (
            <Button
              type="button"
              onClick={() => {
                void publicDocs.search(query, collectionId, true);
              }}
            >
              {t(
                "More results",
                websitePublicTranslation(
                  i18n.language,
                  "More results",
                  "更多结果"
                )
              )}
            </Button>
          )}
        </>
      }
    />
  );
});
