import { useEffect } from "react";
import { observer } from "mobx-react";
import { useTranslation } from "react-i18next";
import { useHistory, useLocation } from "react-router-dom";
import {
  DocsSearchForm,
  DocsSearchResults,
  DocsSearchWrapper,
  DocsSearchFilters,
  DocsSearchCentered,
  DocsSearchEmpty,
} from "~/components/DocsSearch";
import Button from "~/components/Button";
import FilterOptions from "~/components/FilterOptions";
import Scene from "~/components/Scene";
import Text from "~/components/Text";
import { SearchLoading } from "~/scenes/Search/components/SearchLoading";
import { CollectionIcon } from "@shared/components/LucideIcon";
import useStores from "~/hooks/useStores";
import { websitePublicTranslation } from "~/utils/websitePublicTranslation";

/** Reads public search scope and presents projected hits through the shared search components. */
export const PublicSearch = observer(function PublicSearch() {
  const { publicDocs } = useStores();
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const history = useHistory();
  const params = new URLSearchParams(location.search);
  const query = params.get("q")?.trim() ?? "";
  const collectionId = params.get("collectionId") || undefined;
  const generation = publicDocs.generation;
  useEffect(() => {
    void publicDocs.search(query, collectionId);
  }, [publicDocs, query, collectionId, generation]);
  const ready =
    publicDocs.searchQuery === query &&
    publicDocs.searchCollectionId === collectionId &&
    publicDocs.searchResults.status === "ready";
  const failed =
    publicDocs.searchQuery === query &&
    publicDocs.searchCollectionId === collectionId &&
    (publicDocs.searchResults.status === "error" ||
      publicDocs.searchResults.status === "unavailable");
  const handleSearch = (value: string) => {
    const next = new URLSearchParams(location.search);
    if (value) {
      next.set("q", value);
    } else {
      next.delete("q");
    }
    history.replace({ pathname: "/search", search: next.toString() });
  };
  const handleCollectionSelect = (id: string | null | undefined) => {
    const next = new URLSearchParams(location.search);
    if (id) {
      next.set("collectionId", id);
    } else {
      next.delete("collectionId");
    }
    history.replace({ pathname: "/search", search: next.toString() });
  };
  return (
    <Scene textTitle={query ? `${query} – ${t("Search")}` : t("Search")}>
      <DocsSearchWrapper $embedded={false} column auto>
        <DocsSearchForm
          label={t("Search")}
          placeholder={`${t(collectionId ? "Search in collection" : "Search")}…`}
          query={query}
          onSearch={handleSearch}
        >
          <DocsSearchFilters>
            <FilterOptions
              defaultLabel={t("Any collection")}
              selectedKeys={[collectionId ?? ""]}
              onSelect={handleCollectionSelect}
              showFilter
              options={[
                {
                  key: "",
                  label: t("Any collection"),
                  icon: <CollectionIcon size={24} />,
                },
                ...(publicDocs.collections.data ?? []).map((collection) => ({
                  key: collection.id,
                  label: collection.name,
                  icon: <CollectionIcon size={24} />,
                })),
              ]}
            />
          </DocsSearchFilters>
        </DocsSearchForm>
        {!query ? (
          <DocsSearchCentered $embedded={false} column>
            <Text as="p" type="secondary">
              {t(
                "Enter a search term.",
                websitePublicTranslation(
                  i18n.language,
                  "Enter a search term.",
                  "请输入搜索词。"
                )
              )}
            </Text>
          </DocsSearchCentered>
        ) : failed ? (
          <DocsSearchCentered $embedded={false} column role="alert">
            <Text as="h1">{t("Something went wrong")}</Text>
            <Text as="p" type="secondary">
              {t("Please try again or contact support if the problem persists")}
              .
            </Text>
            <Button
              type="button"
              onClick={() => void publicDocs.search(query, collectionId)}
            >
              {t("Retry")}
            </Button>
          </DocsSearchCentered>
        ) : !ready ? (
          <SearchLoading />
        ) : (
          <DocsSearchResults
            results={(publicDocs.searchResults.data ?? []).map((item) => ({
              id: item.id,
              title: item.title,
              to: item.url,
              excerpt: item.excerpt,
            }))}
            emptyContent={<DocsSearchEmpty />}
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
      </DocsSearchWrapper>
    </Scene>
  );
});
