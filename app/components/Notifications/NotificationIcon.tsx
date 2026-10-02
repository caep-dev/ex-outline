import { observer } from "mobx-react";
/**
 *
 * OUTLINE ICON BLOCK
 *
 * import { SubscribeIcon } from "outline-icons";
 */
import { SubscribeIcon } from "@shared/components/LucideIcon";
import styled from "styled-components";
import { s } from "@shared/styles";
import useStores from "~/hooks/useStores";
import Relative from "../Sidebar/components/Relative";

const NotificationIcon = () => {
  const { notifications } = useStores();
  const count = notifications.approximateUnreadCount;

  return (
    <IconWrapper>
      <SubscribeIcon />
      {count > 0 && <Badge />}
    </IconWrapper>
  );
};

const IconWrapper = styled(Relative)`
  width: ${(props) => props.theme.exui.components.sidebarItem.default.iconSize};
  height: ${(props) =>
    props.theme.exui.components.sidebarItem.default.iconSize};
  flex-shrink: 0;

  > svg {
    width: inherit;
    height: inherit;
  }
`;

const Badge = styled.div`
  position: absolute;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${s("accent")};
  top: 0;
  right: 0;
`;

export default observer(NotificationIcon);
