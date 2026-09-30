/**
 *
 * OUTLINE ICON BLOCK
 *
 * import { PlusIcon } from "outline-icons";
 */
import { PlusIcon } from "@shared/components/LucideIcon";
import styled from "styled-components";
import { hover } from "@shared/styles";
import BaseListItem from "~/components/List/Item";

export const InviteIcon = styled(PlusIcon)`
  opacity: 0;
`;

export const ListItem = styled(BaseListItem).attrs({
  small: true,
  border: false,
})`
  margin: 0 -16px;
  padding: 6px 16px;
  border-radius: ${(props) => props.theme.exui.components.sidebarItem.default.radius};

  &: ${hover} ${InviteIcon},
  &:focus ${InviteIcon},
  &:focus-within ${InviteIcon} {
    opacity: 1;
  }
`;
