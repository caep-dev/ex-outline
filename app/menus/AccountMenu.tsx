import { observer } from "mobx-react";
import * as React from "react";
import { useTranslation } from "react-i18next";
import {
  navigateToProfileSettings,
  navigateToAccountPreferences,
  openKeyboardShortcuts,
  logout,
} from "~/actions/definitions/navigation";
import { changeTheme } from "~/actions/definitions/settings";
import { ActionSeparator } from "~/actions";
import { useMenuAction } from "~/hooks/useMenuAction";
import { DropdownMenu } from "~/components/Menu/DropdownMenu";
import useStores from "~/hooks/useStores";

type Props = {
  children?: React.ReactNode;
};

const AccountMenu: React.FC = ({ children }: Props) => {
  const { t } = useTranslation();
  const { auth } = useStores();

  const actions = React.useMemo(
    () =>
      auth.websiteIntegrationEnabled
        ? [changeTheme, navigateToProfileSettings, ActionSeparator, logout]
        : [
            openKeyboardShortcuts,
            changeTheme,
            navigateToProfileSettings,
            navigateToAccountPreferences,
            ActionSeparator,
            logout,
          ],
    [auth.websiteIntegrationEnabled]
  );

  const rootAction = useMenuAction(actions);

  return (
    <DropdownMenu action={rootAction} align="end" ariaLabel={t("Account")}>
      {children}
    </DropdownMenu>
  );
};

export default observer(AccountMenu);
