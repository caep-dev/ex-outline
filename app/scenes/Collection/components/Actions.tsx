import { observer } from "mobx-react";
/**
 *
 * OUTLINE ICON BLOCK
 *
 * import { EditIcon, PlusIcon } from "outline-icons";
 */
import { EditIcon, PlusIcon } from "@shared/components/LucideIcon";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import type Collection from "~/models/Collection";
import { Action } from "~/components/Actions";
import Button from "~/components/Button";
import { GlassToolbar } from "~/components/GlassToolbar";
import Tooltip from "~/components/Tooltip";
import usePolicy from "~/hooks/usePolicy";
import CollectionMenu from "~/menus/CollectionMenu";
import {
  collectionEditPath,
  collectionPath,
  newDocumentPath,
} from "~/utils/routeHelpers";
import useCurrentUser from "~/hooks/useCurrentUser";
import useStores from "~/hooks/useStores";
import type { SidebarContextType } from "~/components/Sidebar/components/SidebarContext";
import { CollectionTab } from "./Navigation";
import lazyWithRetry from "~/utils/lazyWithRetry";
import history from "~/utils/history";
import RegisterKeyDown from "~/components/RegisterKeyDown";
import { useCallback } from "react";

const ShareButton = lazyWithRetry(() => import("./ShareButton"));

type Props = {
  /** The collection for which to render actions */
  collection: Collection;
  /** Whether the collection is in editing mode */
  isEditing: boolean;
  /** Contextual information for the sidebar */
  sidebarContext: SidebarContextType;
};

function Actions({ collection, isEditing, sidebarContext }: Props) {
  const { t } = useTranslation();
  const can = usePolicy(collection);
  const user = useCurrentUser();
  const { auth } = useStores();
  const canManage = !auth.websiteIntegrationEnabled || user.isAdmin;

  const goToEdit = useCallback(() => {
    history.push({
      pathname: collectionEditPath(collection),
      state: { sidebarContext },
    });
  }, [collection, sidebarContext]);

  const goBack = useCallback(() => {
    history.push({
      pathname: collectionPath(collection, CollectionTab.Overview),
      state: { sidebarContext },
    });
  }, [collection, sidebarContext]);

  return (
    <GlassToolbar
      data-collection-toolbar="actions"
      role="group"
      aria-label={t("Collection options")}
    >
      {canManage && can.createDocument && (
        <Action>
          <Tooltip content={t("New document")} shortcut="n" placement="bottom">
            <Button
              as={Link}
              data-slot="action-button"
              to={collection ? newDocumentPath(collection.id) : ""}
              disabled={!collection}
              icon={<PlusIcon />}
              neutral
              borderOnHover
            >
              {t("New doc")}
            </Button>
          </Tooltip>
        </Action>
      )}
      {canManage && !isEditing && user?.separateEditMode && (
        <Action>
          <RegisterKeyDown trigger="e" handler={goToEdit} />
          <Tooltip
            content={t("Edit collection")}
            shortcut="e"
            placement="bottom"
          >
            <Button
              icon={<EditIcon />}
              onClick={goToEdit}
              neutral
              borderOnHover
            >
              {t("Edit")}
            </Button>
          </Tooltip>
        </Action>
      )}
      {canManage && isEditing && user?.separateEditMode && (
        <Action>
          <RegisterKeyDown trigger="Escape" handler={goBack} />
          <Button onClick={goBack}>{t("Done editing")}</Button>
        </Action>
      )}
      {(!isEditing || !user?.separateEditMode) && (
        <Action>
          <ShareButton collection={collection} />
        </Action>
      )}
      <Action>
        <CollectionMenu collection={collection} align="end" neutral />
      </Action>
    </GlassToolbar>
  );
}

export default observer(Actions);
