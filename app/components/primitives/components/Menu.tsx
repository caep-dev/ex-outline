import { exuiTokens } from "@exre/exui/tokens";
/**
 *
 * OUTLINE ICON BLOCK
 *
 * import { ExpandedIcon } from "outline-icons";
 */
import { ExpandedIcon } from "@shared/components/LucideIcon";
import { ellipsis } from "polished";
import { Link } from "react-router-dom";
import styled, { css } from "styled-components";
import type { DefaultTheme } from "styled-components";
import { depths } from "@shared/styles";
import Scrollable from "~/components/Scrollable";
import { fadeAndScaleIn } from "~/styles/animations";

type BaseMenuItemProps = {
  disabled?: boolean;
  $active?: boolean;
  $dangerous?: boolean;
  $submenu?: boolean;
};

const getMenuItemRecipe = (
  props: BaseMenuItemProps & { theme: DefaultTheme }
) =>
  props.$submenu
    ? props.theme.exui.components.menu.submenuTrigger
    : props.theme.exui.components.menu.item;

const BaseMenuItemCSS = css<BaseMenuItemProps>`
  position: relative;
  display: flex;
  justify-content: flex-start;
  align-items: center;
  width: 100%;
  gap: ${(props) => getMenuItemRecipe(props).gap};
  font-family: ${(props) => props.theme.exui.typography.fontFamily};
  font-size: ${(props) => getMenuItemRecipe(props).fontSize};
  font-weight: ${(props) => getMenuItemRecipe(props).fontWeight};
  cursor: var(--pointer);
  user-select: none;
  white-space: nowrap;

  background: ${(props) =>
    props.disabled
      ? getMenuItemRecipe(props).disabled.background
      : props.$active
        ? props.theme.exui.components.menu.checkedItem.background
        : props.$dangerous
          ? props.theme.exui.components.menu.item.destructive.background
          : getMenuItemRecipe(props).default.background};
  color: ${(props) =>
    props.disabled
      ? getMenuItemRecipe(props).disabled.foreground
      : props.$active
        ? props.theme.exui.components.menu.checkedItem.foreground
        : props.$dangerous
          ? props.theme.exui.components.menu.item.destructive.foreground
          : getMenuItemRecipe(props).default.foreground};
  opacity: ${(props) =>
    props.disabled
      ? getMenuItemRecipe(props).disabled.opacity
      : props.$dangerous
        ? props.theme.exui.components.menu.item.destructive.opacity
        : getMenuItemRecipe(props).default.opacity};

  margin: 0;
  border: 1px solid
    ${(props) =>
      props.disabled
        ? getMenuItemRecipe(props).disabled.border
        : props.$dangerous
          ? props.theme.exui.components.menu.item.destructive.border
          : getMenuItemRecipe(props).default.border};
  border-radius: ${(props) => getMenuItemRecipe(props).radius};
  padding-block: ${(props) => getMenuItemRecipe(props).paddingBlock};
  padding-inline: ${(props) => getMenuItemRecipe(props).paddingInline};
  box-shadow: ${(props) =>
    props.disabled
      ? getMenuItemRecipe(props).disabled.shadow
      : props.$dangerous
        ? props.theme.exui.components.menu.item.destructive.shadow
        : getMenuItemRecipe(props).default.shadow};

  ${(props) => props.disabled && "pointer-events: none;"}

  svg {
    flex-shrink: 0;
    opacity: ${(props) => (props.disabled ? ".5" : 1)};
  }

  svg:not([data-fixed-color]) {
    color: inherit;
    /**
     * OUTLINE ICON BLOCK
     * fill: currentColor;
     */
    &:not(.lucide) {
      fill: currentColor;
    }
  }

  &:focus-visible {
    outline: 0; // Disable default outline on Firefox
  }

  ${(props) =>
    !props.disabled &&
    `
      &[data-highlighted] {
        color: ${
          props.$dangerous
            ? props.theme.exui.components.menu.item.destructive.foreground
            : getMenuItemRecipe(props).hover.foreground
        };
        background: ${
          props.$dangerous
            ? props.theme.exui.components.menu.item.destructive.background
            : getMenuItemRecipe(props).hover.background
        };
        border-color: ${
          props.$dangerous
            ? props.theme.exui.components.menu.item.destructive.border
            : getMenuItemRecipe(props).hover.border
        };
        box-shadow: ${
          props.$dangerous
            ? props.theme.exui.components.menu.item.destructive.shadow
            : getMenuItemRecipe(props).hover.shadow
        };
        opacity: ${
          props.$dangerous
            ? props.theme.exui.components.menu.item.destructive.opacity
            : getMenuItemRecipe(props).hover.opacity
        };
        cursor: var(--pointer);
      }

      &[data-state="open"],
      &:active {
        color: ${
          props.$dangerous
            ? props.theme.exui.components.menu.item.destructive.foreground
            : getMenuItemRecipe(props).active.foreground
        };
        background: ${
          props.$dangerous
            ? props.theme.exui.components.menu.item.destructive.background
            : getMenuItemRecipe(props).active.background
        };
        border-color: ${
          props.$dangerous
            ? props.theme.exui.components.menu.item.destructive.border
            : getMenuItemRecipe(props).active.border
        };
        box-shadow: ${
          props.$dangerous
            ? props.theme.exui.components.menu.item.destructive.shadow
            : getMenuItemRecipe(props).active.shadow
        };
        opacity: ${
          props.$dangerous
            ? props.theme.exui.components.menu.item.destructive.opacity
            : getMenuItemRecipe(props).active.opacity
        };
      }

      &:focus-visible {
        color: ${
          props.$dangerous
            ? props.theme.exui.components.menu.item.destructive.foreground
            : getMenuItemRecipe(props).focus.foreground
        };
        background: ${
          props.$dangerous
            ? props.theme.exui.components.menu.item.destructive.background
            : getMenuItemRecipe(props).focus.background
        };
        border-color: ${
          props.$dangerous
            ? props.theme.exui.components.menu.item.destructive.border
            : getMenuItemRecipe(props).focus.border
        };
        box-shadow: ${
          props.$dangerous
            ? props.theme.exui.components.menu.item.destructive.shadow
            : getMenuItemRecipe(props).focus.shadow
        };
        opacity: ${
          props.$dangerous
            ? props.theme.exui.components.menu.item.destructive.opacity
            : getMenuItemRecipe(props).focus.opacity
        };
      }
  `}

  ${(props) =>
    props.$active &&
    !props.disabled &&
    css`
      background: ${props.$dangerous
        ? props.theme.exui.components.menu.item.destructive.background
        : props.theme.exui.components.menu.checkedItem.background};
      color: ${props.$dangerous
        ? props.theme.exui.components.menu.item.destructive.foreground
        : props.theme.exui.components.menu.checkedItem.foreground};
    `}
`;

type MenuButtonProps = BaseMenuItemProps & {
  $dangerous?: boolean;
};

export const MenuButton = styled.button<MenuButtonProps>`
  ${BaseMenuItemCSS}
`;

export const MenuInternalLink = styled(Link)`
  ${BaseMenuItemCSS}
`;

export const MenuExternalLink = styled.a`
  ${BaseMenuItemCSS}
`;

export const MenuSubTrigger = styled.div.attrs<BaseMenuItemProps>({
  $submenu: true,
})`
  ${BaseMenuItemCSS}
  // Reserve space for the absolutely-positioned disclosure arrow so long
  // labels truncate before it rather than overlapping.
  padding-inline-end: 32px;
`;

export const MenuSeparator = styled.hr`
  border: 0;
  height: ${(props) => props.theme.exui.components.menu.separator.thickness};
  margin-block: ${(props) =>
    props.theme.exui.components.menu.separator.marginBlock};
  margin-inline: 0;
  background: ${(props) => props.theme.exui.components.menu.separator.color};
`;

export const MenuLabel = styled.div`
  ${ellipsis()}
  flex-grow: 1;
  display: flex;
  align-items: center;
  gap: 4px;
`;

export const MenuHeader = styled.h3`
  font-size: ${exuiTokens.typography.smallFontSize};
  font-weight: ${(props) => props.theme.exui.typography.fontWeightBold};
  text-transform: uppercase;
  color: ${(props) => props.theme.exui.surface.foregroundTertiary};
  letter-spacing: 0.04em;
  margin: 1em 12px 0.5em;
  user-select: none;
`;

export const MenuDisclosure = styled(ExpandedIcon)`
  transform: rotate(270deg);
  position: absolute;
  inset-inline-end: 8px;
  color: ${(props) => props.theme.exui.surface.foregroundTertiary};

  [dir="rtl"] & {
    transform: rotate(90deg);
  }
`;

export const MenuIconWrapper = styled.span`
  width: 24px;
  height: 24px;
  color: ${(props) => props.theme.exui.components.menu.item.default.foreground};
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
`;

export const SelectedIconWrapper = styled.span`
  width: 24px;
  height: 24px;
  color: ${(props) => props.theme.exui.components.menu.checkedItem.indicator};
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
`;

export const MenuShortcut = styled.span`
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: ${(props) => props.theme.exui.components.menu.shortcut.fontSize};
  font-feature-settings: "cv08", "zero";
  letter-spacing: ${(props) =>
    props.theme.exui.components.menu.shortcut.letterSpacing};
  color: ${(props) => props.theme.exui.components.menu.shortcut.foreground};
  margin-inline-start: ${(props) =>
    props.theme.exui.components.menu.shortcut.marginInlineStart};
  flex-shrink: 0;
`;

type MenuContentProps = {
  maxHeightVar: string;
  transformOriginVar: string;
};

export const MenuContent = styled(Scrollable).attrs<MenuContentProps>(
  (props) => ({
    // Fades the last item out at the bottom edge when the menu is scrollable.
    fadeTo: props.theme.exui.components.menu.surface.background,
    bottomShadow: true,
  })
)<MenuContentProps>`
  z-index: ${depths.menu};
  min-width: 180px;
  max-width: 320px;
  min-height: 44px;
  max-height: ${({ maxHeightVar }) => `min(85vh, var(${maxHeightVar}))`};
  font-weight: normal;

  background: ${(props) => props.theme.exui.components.menu.surface.background};
  color: ${(props) => props.theme.exui.components.menu.surface.foreground};
  box-shadow: ${(props) => props.theme.exui.components.menu.surface.shadow};
  border: 1px solid
    ${(props) => props.theme.exui.components.menu.surface.border};
  border-radius: ${(props) => props.theme.exui.components.menu.surface.radius};
  padding: ${(props) => props.theme.exui.components.menu.surface.padding};
  font-family: ${(props) => props.theme.exui.typography.fontFamily};
  outline: none;

  transform-origin: ${({ transformOriginVar }) => `var(${transformOriginVar})`};

  &[data-state="open"] {
    animation: ${fadeAndScaleIn} 150ms ease-out;
  }

  @media print {
    display: none;
  }
`;
