import { ExpandedIcon } from "outline-icons";
import { ellipsis } from "polished";
import { Link } from "react-router-dom";
import styled, { css } from "styled-components";
import type { DefaultTheme, ThemeProps } from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { depths } from "@shared/styles";
import Scrollable from "~/components/Scrollable";
import { fadeAndScaleIn } from "~/styles/animations";

type BaseMenuItemProps = {
  disabled?: boolean;
  $active?: boolean;
  $dangerous?: boolean;
};

const BaseMenuItemCSS = css<BaseMenuItemProps>`
  position: relative;
  display: flex;
  justify-content: flex-start;
  align-items: center;
  width: 100%;
  min-height: ${(props) => props.theme.exui.density.compact.controlHeight};
  font-size: 16px;
  cursor: var(--pointer);
  user-select: none;
  white-space: nowrap;

  background: none;
  color: ${(props) =>
    props.disabled
      ? props.theme.exui.overlay.menu.foregroundDisabled
      : props.theme.exui.overlay.menu.foreground};

  margin: 0;
  border: 0;
  border-radius: ${(props) => props.theme.exui.radii.small};
  padding: ${(props) => props.theme.exui.density.compact.controlPaddingInline};

  ${(props) => props.disabled && "pointer-events: none;"}

  svg {
    flex-shrink: 0;
    opacity: ${(props) => (props.disabled ? ".5" : 1)};
  }

  &:focus-visible {
    outline: 0; // Disable default outline on Firefox
  }

  ${(props) =>
    props.$active &&
    !props.disabled &&
    `
    color: ${
      props.$dangerous
        ? props.theme.exui.overlay.menu.itemForegroundDanger
        : props.theme.exui.overlay.menu.itemForegroundSelected
    };
    background: ${
      props.$dangerous
        ? props.theme.exui.overlay.menu.itemBackgroundDanger
        : props.theme.exui.overlay.menu.itemBackgroundSelected
    };
    outline-color: ${
      props.$dangerous
        ? props.theme.exui.overlay.menu.itemBackgroundDanger
        : props.theme.exui.overlay.menu.itemBackgroundSelected
    };
    box-shadow: none;
    cursor: var(--pointer);

    svg:not([data-fixed-color]) {
      color: ${
        props.$dangerous
          ? props.theme.exui.overlay.menu.itemForegroundDanger
          : props.theme.exui.overlay.menu.itemForegroundSelected
      };
      fill: ${
        props.$dangerous
          ? props.theme.exui.overlay.menu.itemForegroundDanger
          : props.theme.exui.overlay.menu.itemForegroundSelected
      };
    }
  `}

  ${(props) =>
    !props.disabled &&
    `
      &[data-highlighted],
      &[data-state="open"],
      &:focus-visible {
        color: ${
          props.$dangerous
            ? props.theme.exui.overlay.menu.itemForegroundDanger
            : props.theme.exui.overlay.menu.itemForegroundHover
        };
        background: ${
          props.$dangerous
            ? props.theme.exui.overlay.menu.itemBackgroundDanger
            : props.theme.exui.overlay.menu.itemBackgroundHover
        };
        outline-color: ${
          props.$dangerous
            ? props.theme.exui.overlay.menu.itemBackgroundDanger
            : props.theme.exui.overlay.menu.itemBackgroundHover
        };
        box-shadow: none;
        cursor: var(--pointer);

        svg:not([data-fixed-color]) {
          color: ${
            props.$dangerous
              ? props.theme.exui.overlay.menu.itemForegroundDanger
              : props.theme.exui.overlay.menu.itemForegroundHover
          };
          fill: ${
            props.$dangerous
              ? props.theme.exui.overlay.menu.itemForegroundDanger
              : props.theme.exui.overlay.menu.itemForegroundHover
          };
        }
      }
  `}

  ${breakpoint("tablet")`
    padding: 4px 12px;
    font-size: ${(props: ThemeProps<DefaultTheme> & BaseMenuItemProps) =>
      props.theme.exui.typography.smallFontSize};
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

export const MenuSubTrigger = styled.div<BaseMenuItemProps>`
  ${BaseMenuItemCSS}
  // Reserve space for the absolutely-positioned disclosure arrow so long
  // labels truncate before it rather than overlapping.
  padding-inline-end: 32px;
`;

export const MenuSeparator = styled.hr`
  border: 0;
  height: 1px;
  margin: 6px 0;
  background: ${(props) => props.theme.exui.overlay.menu.separator};
`;

export const MenuLabel = styled.div`
  ${ellipsis()}
  flex-grow: 1;
  display: flex;
  align-items: center;
  gap: 4px;
`;

export const MenuHeader = styled.h3`
  font-size: 11px;
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
  margin-inline-end: 6px;
  margin-inline-start: -4px;
  color: ${(props) => props.theme.exui.overlay.menu.foreground};
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
`;

export const SelectedIconWrapper = styled.span`
  width: 24px;
  height: 24px;
  margin-inline-end: -6px;
  color: ${(props) => props.theme.exui.control.primary};
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
`;

export const MenuShortcut = styled.span`
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 12px;
  font-feature-settings: "cv08", "zero";
  color: currentColor;
  opacity: 0.5;
  margin-inline-start: 16px;
  flex-shrink: 0;
`;

type MenuContentProps = {
  maxHeightVar: string;
  transformOriginVar: string;
};

export const MenuContent = styled(Scrollable).attrs<MenuContentProps>(
  (props) => ({
    // Fades the last item out at the bottom edge when the menu is scrollable.
    fadeTo: props.theme.exui.overlay.menu.background,
    bottomShadow: true,
  })
)<MenuContentProps>`
  z-index: ${depths.menu};
  min-width: 180px;
  max-width: 320px;
  min-height: 44px;
  max-height: ${({ maxHeightVar }) => `min(85vh, var(${maxHeightVar}))`};
  font-weight: normal;

  background: ${(props) => props.theme.exui.overlay.menu.background};
  color: ${(props) => props.theme.exui.overlay.menu.foreground};
  box-shadow: ${(props) => props.theme.exui.overlay.menu.shadow};
  border-radius: ${(props) => props.theme.exui.overlay.menu.radius};
  // Vertical spacing comes from spacers rather than padding so that the bottom
  // fade, which is confined to the content box, can reach the menu's edge.
  padding: 0 6px;
  outline: none;

  &::before,
  &::after {
    content: "";
    display: block;
    height: 6px;
  }

  transform-origin: ${({ transformOriginVar }) => `var(${transformOriginVar})`};

  &[data-state="open"] {
    animation: ${fadeAndScaleIn} 150ms ease-out;
  }

  @media print {
    display: none;
  }
`;
