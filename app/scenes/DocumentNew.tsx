import { observer } from "mobx-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useHistory, useLocation, useRouteMatch } from "react-router-dom";
import { toast } from "sonner";
import { UserPreference } from "@shared/types";
import { ProsemirrorDataHelper } from "@shared/utils/ProsemirrorDataHelper";
import CenteredContent from "~/components/CenteredContent";
import { CollectionCreateChooser } from "~/components/CollectionCreateChooser";
import Flex from "~/components/Flex";
import PlaceholderDocument from "~/components/PlaceholderDocument";
import useCurrentUser from "~/hooks/useCurrentUser";
import useQuery from "~/hooks/useQuery";
import useStores from "~/hooks/useStores";
import { preloadEditor } from "~/routes/scenes";
import { documentEditPath, documentPath } from "~/utils/routeHelpers";

function DocumentNew() {
  const history = useHistory();
  const location = useLocation();
  const query = useQuery();
  const user = useCurrentUser();
  const match = useRouteMatch<{ collectionSlug?: string }>();
  const { t } = useTranslation();
  const {
    auth,
    documents,
    collections,
    policies,
    userMemberships,
    groupMemberships,
  } = useStores();
  const id = match.params.collectionSlug || query.get("collectionId");
  const parentId = query.get("parentDocumentId");

  useEffect(() => {
    if (auth.websiteIntegrationEnabled && !id && !parentId) {
      return;
    }
    // Download the editor while the document is being created on the server
    preloadEditor();

    async function createDocument() {
      const index = parseInt(query.get("index") || "0", 10);
      const parentDocumentId = query.get("parentDocumentId") ?? undefined;
      let parentDocument = parentDocumentId
        ? documents.get(parentDocumentId)
        : undefined;
      let collection;

      try {
        if (
          auth.websiteIntegrationEnabled &&
          parentDocumentId &&
          !parentDocument
        ) {
          parentDocument = await documents.fetch(parentDocumentId);
        }
        const targetCollectionId =
          id ||
          (auth.websiteIntegrationEnabled
            ? parentDocument?.collectionId
            : undefined);
        if (targetCollectionId) {
          collection = await collections.fetch(targetCollectionId);
        }
        if (
          auth.websiteIntegrationEnabled &&
          parentDocument &&
          parentDocument.collectionId !== collection?.id
        ) {
          throw new Error("Parent document belongs to another collection");
        }

        if (
          auth.websiteIntegrationEnabled &&
          (!collection?.id || !policies.abilities(collection.id).createDocument)
        ) {
          throw new Error("Collection creation permission required");
        }

        const document = await documents.create(
          {
            collectionId: collection?.id,
            parentDocumentId,
            fullWidth:
              parentDocument?.fullWidth ||
              user.getPreference(UserPreference.FullWidthDocuments),
            templateId: query.get("templateId") ?? undefined,
            title: query.get("title") ?? "",
            data: ProsemirrorDataHelper.getEmpty(),
          },
          {
            publish: collection?.id || parentDocumentId ? true : undefined,
            index,
          }
        );

        if (parentDocumentId) {
          userMemberships
            .getByDocumentId(document.id)
            ?.addDocument(document, parentDocumentId);

          groupMemberships
            .getByDocumentId(document.id)
            ?.addDocument(document, parentDocumentId);
        }

        history.replace(
          !user.separateEditMode
            ? documentPath(document)
            : documentEditPath(document),
          location.state
        );
      } catch (_err) {
        toast.error(t("Couldn’t create the document, try again?"));
        history.goBack();
      }
    }

    void createDocument();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (auth.websiteIntegrationEnabled && !id && !parentId) {
    return <CollectionCreateChooser />;
  }

  return (
    <Flex column auto>
      <CenteredContent>
        <PlaceholderDocument />
      </CenteredContent>
    </Flex>
  );
}

export default observer(DocumentNew);
