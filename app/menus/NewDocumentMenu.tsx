import { observer } from "mobx-react";
/**
 *
 * OUTLINE ICON BLOCK
 *
 * import { PlusIcon } from "outline-icons";
 */
import { PlusIcon } from "@shared/components/LucideIcon";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import Button from "~/components/Button";
import Tooltip from "~/components/Tooltip";
import useStores from "~/hooks/useStores";
import useCurrentTeam from "~/hooks/useCurrentTeam";
import usePolicy from "~/hooks/usePolicy";
import { preloadEditor } from "~/routes/scenes";
import { newDocumentPath } from "~/utils/routeHelpers";

function NewDocumentMenu() {
  const { t } = useTranslation();
  const team = useCurrentTeam();
  const can = usePolicy(team);
  const { auth, collections, policies } = useStores();
  const hasEditableCollection = collections.allActive.some(
    (collection) => policies.abilities(collection.id).createDocument
  );

  if (
    auth.websiteIntegrationEnabled
      ? !hasEditableCollection
      : !can.createDocument
  ) {
    return null;
  }

  return (
    <Tooltip content={t("New document")} shortcut="n" placement="bottom">
      <Button
        as={Link}
        to={newDocumentPath()}
        icon={<PlusIcon />}
        onPointerEnter={preloadEditor}
        onFocus={preloadEditor}
      >
        {t("New doc")}
      </Button>
    </Tooltip>
  );
}

export default observer(NewDocumentMenu);
