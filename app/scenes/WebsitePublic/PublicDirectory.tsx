import { useEffect } from "react";
import { truncate } from "es-toolkit/compat";
import { observer } from "mobx-react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import styled from "styled-components";
import { CollectionIcon, DocumentIcon } from "@shared/components/LucideIcon";
import { s } from "@shared/styles";
import { DocsStatus } from "~/components/DocsStatus";
import {
  DocsSearchResultLink,
  DocsSearchResultContent,
} from "~/components/DocsSearch";
import Button from "~/components/Button";
import Editor from "~/components/Editor";
import Heading from "~/components/Heading";
import Scene from "~/components/Scene";
import useStores from "~/hooks/useStores";
import { websitePublicTranslation } from "~/utils/websitePublicTranslation";
import { PublicFeedback } from "./PublicFeedback";
import { PublicReadingNavigation } from "./PublicReadingNavigation";

/** Resolves public collection routes and presents the cached shared directory. */
export const PublicDirectory = observer(function PublicDirectory() {
  const { publicDocs } = useStores();
  const { t, i18n } = useTranslation();
  const { collectionId } = useParams<{ collectionId?: string }>();
  const generation = publicDocs.generation;
  useEffect(() => {
    if (collectionId) {
      void publicDocs.loadCollection(collectionId);
    }
  }, [publicDocs, collectionId, generation]);
  const state = publicDocs.selectedCollection;
  const collection =
    collectionId &&
    publicDocs.collectionKey === collectionId &&
    state.status === "ready"
      ? state.data
      : undefined;
  const title = collection?.name ?? t("Collections");
  const searchPath = collection
    ? `/search?${new URLSearchParams({ collectionId: collection.id })}`
    : "/search";
  const collections = publicDocs.collections;
  const tree = collectionId ? publicDocs.trees.get(collectionId) : undefined;
  const collectionPending = collectionId && !collection;
  const directoryPending =
    !collectionId &&
    collections.status !== "ready" &&
    !collections.data?.length;
  return (
    <Scene
      title={title}
      left={<PublicReadingNavigation searchPath={searchPath} />}
    >
      {collectionPending ? (
        <PublicFeedback
          layout="page"
          state={
            publicDocs.collectionKey === collectionId ? state.status : "loading"
          }
          reason={
            publicDocs.collectionKey === collectionId ? state.reason : undefined
          }
          retry={() => {
            void publicDocs.loadCollection(collectionId, true);
          }}
        />
      ) : directoryPending ? (
        <PublicFeedback
          layout="page"
          state={collections.status}
          reason={collections.reason}
          retry={() => {
            void publicDocs.loadNextCollections(true);
          }}
        />
      ) : (
        <>
          <Heading tabIndex={-1} data-docs-focus="true">
            {title}
          </Heading>
          {collection ? (
            <>
              {collection.description?.trim() && (
                <Editor
                  key={`${generation}:${collection.id}`}
                  publicReader
                  readOnly
                  value={collection.description}
                  defaultValue={collection.description}
                />
              )}
              <Heading as="h2">{t("Documents")}</Heading>
              {!tree || tree.status !== "ready" ? (
                <PublicFeedback
                  state={tree?.status ?? "loading"}
                  reason={tree?.reason}
                  retry={() => {
                    void publicDocs.loadCollectionTree(collection.id, true);
                  }}
                />
              ) : tree.data?.length ? (
                <List>
                  {tree.data.map((item) => (
                    <li key={item.id}>
                      <DirectoryLink to={item.to} aria-label={item.label}>
                        <RowIcon as={DocumentIcon} aria-hidden />
                        <DocsSearchResultContent title={item.label} />
                      </DirectoryLink>
                    </li>
                  ))}
                </List>
              ) : (
                <DocsStatus
                  state="empty"
                  title={t("Documents")}
                  content={t(
                    "This collection has no public documents.",
                    websitePublicTranslation(
                      i18n.language,
                      "This collection has no public documents.",
                      "此集合暂无公开文档。"
                    )
                  )}
                />
              )}
            </>
          ) : (
            <>
              {collections.data?.length ? (
                <List>
                  {collections.data.map((item) => (
                    <li key={item.id}>
                      <DirectoryLink to={item.url} aria-label={item.name}>
                        <RowIcon as={CollectionIcon} aria-hidden />
                        <DocsSearchResultContent
                          title={item.name}
                          excerpt={
                            item.description?.trim()
                              ? truncate(item.description, { length: 200 })
                              : undefined
                          }
                        />
                      </DirectoryLink>
                    </li>
                  ))}
                </List>
              ) : collections.status === "ready" ? (
                <DocsStatus
                  state="empty"
                  title={t(
                    "No public collections",
                    websitePublicTranslation(
                      i18n.language,
                      "No public collections",
                      "暂无公开文档集"
                    )
                  )}
                  content={t(
                    "Public collections will appear here.",
                    websitePublicTranslation(
                      i18n.language,
                      "Public collections will appear here.",
                      "公开文档集将在这里显示。"
                    )
                  )}
                />
              ) : null}
              {collections.status !== "ready" && (
                <PublicFeedback
                  state={collections.status}
                  reason={collections.reason}
                  retry={() => {
                    void publicDocs.loadNextCollections(true);
                  }}
                />
              )}
              {publicDocs.hasMoreCollections &&
                collections.status === "ready" && (
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
                )}
            </>
          )}
        </>
      )}
    </Scene>
  );
});

const List = styled.ul`
  padding: 0;
  list-style: none;
`;

const DirectoryLink = styled(DocsSearchResultLink)`
  width: auto;
  max-width: 100%;
  min-width: 0;
`;

const RowIcon = styled(DocumentIcon)`
  align-self: flex-start;
  flex-shrink: 0;
  margin-inline-end: 4px;
  color: ${s("textSecondary")};
`;
