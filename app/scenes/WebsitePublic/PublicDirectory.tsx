import { useEffect } from "react";
import { observer } from "mobx-react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import { DocsStatus } from "~/components/DocsStatus";
import Button from "~/components/Button";
import { DocumentReadingFrame } from "~/scenes/Document/components/DocumentReadingFrame";
import useStores from "~/hooks/useStores";
import { websitePublicTranslation } from "~/utils/websitePublicTranslation";
import { PublicFeedback } from "./PublicFeedback";

/** Revalidates public collection routes and presents the shared directory. */
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
  if (collectionId) {
    const state = publicDocs.selectedCollection;
    if (publicDocs.collectionKey !== collectionId || state.status !== "ready") {
      return (
        <PublicFeedback
          state={
            publicDocs.collectionKey === collectionId ? state.status : "loading"
          }
          reason={state.reason}
          retry={() => {
            void publicDocs.loadCollection(collectionId);
          }}
        />
      );
    }
    const collection = state.data;
    const tree = publicDocs.trees.get(collectionId);
    return (
      <DocumentReadingFrame
        title={collection?.name ?? t("Collections")}
        ready={tree?.status === "ready"}
        breadcrumb={<Link to="/">{t("Documents")}</Link>}
        editor={
          <>
            {collection?.description && <p>{collection.description}</p>}
            {!tree || tree.status !== "ready" ? (
              <PublicFeedback
                state={tree?.status ?? "loading"}
                reason={tree?.reason}
                retry={() => {
                  void publicDocs.loadCollectionTree(collectionId, true);
                }}
              />
            ) : tree.data?.length ? (
              <ul>
                {tree.data.map((item) => (
                  <li key={item.id}>
                    <Link to={item.to}>{item.label}</Link>
                  </li>
                ))}
              </ul>
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
        }
      />
    );
  }
  const collections = publicDocs.collections;
  return (
    <DocumentReadingFrame
      title={t("Collections")}
      ready={collections.status === "ready"}
      editor={
        <>
          {collections.data?.length ? (
            <ul>
              {collections.data.map((collection) => (
                <li key={collection.id}>
                  <Link to={collection.url}>{collection.name}</Link>
                  {collection.description && <p>{collection.description}</p>}
                </li>
              ))}
            </ul>
          ) : collections.status === "ready" ? (
            <DocsStatus
              state="empty"
              title={t("No collections")}
              content={t("No collections")}
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
          {publicDocs.hasMoreCollections && collections.status === "ready" && (
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
      }
    />
  );
});
