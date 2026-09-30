import type { LocationDescriptor } from "history";
import * as React from "react";
import styled, { useTheme, css } from "styled-components";
import type { DefaultTheme, ThemeProps } from "styled-components";
import breakpoint from "styled-components-breakpoint";
import EventBoundary from "@shared/components/EventBoundary";
import { ellipsis, hover, s } from "@shared/styles";
import { isMobile } from "@shared/utils/browser";
import NudeButton from "~/components/NudeButton";
import { UnreadBadge } from "~/components/UnreadBadge";
import useClickIntent from "~/hooks/useClickIntent";
import { undraggableOnDesktop } from "~/styles";
import Disclosure from "./Disclosure";
import type { Props as NavLinkProps } from "./NavLink";
import NavLink from "./NavLink";
import type { ActionFactory, ActionWithChildren } from "~/types";
import { ContextMenu } from "~/components/Menu/ContextMenu";
import { useTranslation } from "react-i18next";

/**
 * Props for the SidebarLink component.
 * Extends NavLink props with additional sidebar-specific functionality.
 */
type Props = Omit<NavLinkProps, "to"> & {
  /** The location to navigate to when the link is clicked */
  to?: LocationDescriptor;
  /** Ref callback to access the underlying HTML element */
  innerRef?: (ref: HTMLElement | null | undefined) => void;
  /** Callback fired when the link is clicked */
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
  /** Callback when we expect the user to click on the link. Used for prefetching data. */
  onClickIntent?: React.MouseEventHandler<HTMLElement>;
  /** Callback fired when the disclosure icon is clicked */
  onDisclosureClick?: React.MouseEventHandler<HTMLElement>;
  /** Icon to display on the left side of the link */
  icon?: React.ReactNode;
  /** Text label or content to display for the link */
  label?: React.ReactNode;
  /** Optional menu to display on hover or interaction */
  menu?: React.ReactNode;
  /** Whether to show an unread badge indicator */
  unreadBadge?: boolean;
  /** Whether to show action buttons on hover */
  $showActions?: boolean;
  /** Whether the link is disabled and non-interactive */
  disabled?: boolean;
  /** Whether the link is currently active */
  active?: boolean;
  /** If set, a disclosure will be rendered to the left of any icon */
  expanded?: boolean;
  /** Whether this link is the current active drop target for drag and drop */
  isActiveDrop?: boolean;
  /** Whether this link represents a draft document */
  isDraft?: boolean;
  /** Nesting depth level for indentation (0-based) */
  depth?: number;
  /** Whether to truncate the label text (default: true, causes overflow: hidden) */
  ellipsis?: boolean;
  /** Whether to automatically scroll this link into view if needed */
  scrollIntoViewIfNeeded?: boolean;
  /** Optional context menu action to display */
  contextAction?: ActionWithChildren | ActionFactory;
};

const activeDropStyle = {
  fontWeight: 600,
};

// Prevents the parent NavLink's mousedown handler from firing (which would
// navigate or toggle), without calling preventDefault — that would block the
// native HTML5 drag from initiating on the draggable row.
const stopPropagation = (ev: React.MouseEvent) => {
  ev.stopPropagation();
};

function SidebarLink(
  {
    icon,
    onClick,
    onClickIntent,
    to,
    label,
    active,
    isActiveDrop,
    isDraft,
    menu,
    $showActions,
    exact,
    href,
    depth,
    className,
    expanded,
    onDisclosureClick,
    disabled,
    unreadBadge,
    contextAction,
    ellipsis = true,
    ...rest
  }: Props,
  ref: React.RefObject<HTMLAnchorElement>
) {
  const hasDisclosure = expanded !== undefined;
  const { t } = useTranslation();
  const theme = useTheme();
  const { handleMouseEnter, handleMouseLeave } = useClickIntent(onClickIntent);
  const geometry = depth
    ? theme.exui.components.sidebarItem.nested
    : theme.exui.components.sidebarItem.default;
  const style = React.useMemo(
    () => ({
      paddingInlineStart: `calc(${(depth || 0) * 16}px + ${geometry.paddingInline})`,
      paddingInlineEnd: unreadBadge ? "32px" : undefined,
    }),
    [depth, geometry.paddingInline, unreadBadge]
  );

  const unreadStyle = React.useMemo(
    () => ({
      insetInlineEnd: -20,
    }),
    []
  );

  const activeStyle = React.useMemo(
    () => ({
      color: theme.exui.components.sidebarItem.active.foreground,
      background: theme.exui.components.sidebarItem.active.background,
      borderColor: theme.exui.components.sidebarItem.active.border,
      boxShadow: theme.exui.components.sidebarItem.active.shadow,
      opacity: theme.exui.components.sidebarItem.active.opacity,
      ...style,
    }),
    [theme.exui.components.sidebarItem.active, style]
  );

  const handleClick = React.useCallback(
    (ev: React.MouseEvent<HTMLAnchorElement>) => {
      if (onClick && !disabled && ev.isDefaultPrevented() === false) {
        onClick(ev);
      }
    },
    [onClick, disabled]
  );

  const handleDisclosureClick = React.useCallback(
    (ev: React.MouseEvent<HTMLElement>) => {
      if (!hasDisclosure) {
        return;
      }
      ev.preventDefault();
      ev.stopPropagation();
      onDisclosureClick?.(ev);
    },
    [onDisclosureClick, hasDisclosure]
  );

  const DisclosureComponent = icon ? HiddenDisclosure : Disclosure;

  const innerContent = (
    <>
      <ContextMenu action={contextAction} ariaLabel={t("Link options")}>
        <Content>
          {hasDisclosure && (
            <DisclosureComponent
              expanded={expanded}
              onClick={handleDisclosureClick}
              onMouseDown={stopPropagation}
              tabIndex={-1}
            />
          )}
          {icon && <IconWrapper aria-hidden>{icon}</IconWrapper>}
          <Label $ellipsis={ellipsis}>{label}</Label>
          {unreadBadge && <UnreadBadge style={unreadStyle} />}
        </Content>
      </ContextMenu>
      {menu && <Actions $showActions={$showActions}>{menu}</Actions>}
    </>
  );

  if (!to) {
    return (
      <Link
        as={href ? "a" : "button"}
        $isActiveDrop={isActiveDrop}
        $isDraft={isDraft}
        $disabled={disabled}
        $nested={Boolean(depth)}
        style={active ? activeStyle : style}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onDragEnter={handleMouseEnter}
        href={href}
        className={className}
        ref={ref}
        {...rest}
      >
        {innerContent}
      </Link>
    );
  }

  return (
    <Link
      $isActiveDrop={isActiveDrop}
      $isDraft={isDraft}
      $disabled={disabled}
      $nested={Boolean(depth)}
      style={active ? activeStyle : style}
      activeStyle={isActiveDrop ? activeDropStyle : activeStyle}
      onClick={handleClick}
      onActiveClick={handleDisclosureClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onDragEnter={handleMouseEnter}
      exact={exact !== false}
      to={to}
      href={href}
      className={className}
      // @ts-expect-error spread props cause overload mismatch with styled NavLink
      ref={ref}
      {...rest}
    >
      {innerContent}
    </Link>
  );
}

export const IconWrapper = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: ${(props) => props.theme.exui.components.sidebarItem.default.iconSize};
  height: ${(props) =>
    props.theme.exui.components.sidebarItem.default.iconSize};
  overflow: hidden;
  flex-shrink: 0;
  transition: opacity 200ms ease-in-out;

  > svg {
    width: inherit;
    height: inherit;
  }
`;

const Content = styled.span`
  display: flex;
  align-items: center;
  gap: ${(props) => props.theme.exui.components.sidebarItem.default.gap};
  position: relative;
  width: 100%;
  min-width: 0;
`;

const Actions = styled(EventBoundary)<{ $showActions?: boolean }>`
  display: inline-flex;
  visibility: ${(props) => (props.$showActions ? "visible" : "hidden")};

  [data-drag-active] & {
    display: none;
  }

  position: absolute;
  top: 3px;
  inset-inline-end: 4px;
  gap: 4px;
  color: ${s("textTertiary")};
  transition: opacity 50ms;
  height: 24px;
  background: var(--background);

  svg {
    color: ${s("textSecondary")};
    opacity: 0.5;
  }

  /**
   * OUTLINE ICON BLOCK
   * svg { fill: currentColor; }
   */
  svg:not(.lucide) {
    fill: currentColor;
  }

  &:hover {
    visibility: visible;

    svg {
      opacity: 0.75;
    }
  }
`;

const HiddenDisclosure = styled(Disclosure)`
  position: inherit;
  inset-inline-start: initial;
  display: none;
  margin-inline-start: -2px;
  margin-inline-end: 6px;
`;

interface LinkStyleProps {
  $isActiveDrop?: boolean;
  $isDraft?: boolean;
  $disabled?: boolean;
  $nested?: boolean;
}

const Link = styled(NavLink)<LinkStyleProps>`
  --background: ${(props) =>
    props.theme.exui.components.sidebarItem.default.background};
  --foreground: ${(props) =>
    props.theme.exui.components.sidebarItem.default.foreground};

  &:hover,
  &:has([data-state="open"]) {
    --background: ${(props) =>
      props.theme.exui.components.sidebarItem.hover.background};
    --foreground: ${(props) =>
      props.theme.exui.components.sidebarItem.hover.foreground};
    border-color: ${(props) =>
      props.theme.exui.components.sidebarItem.hover.border};
    box-shadow: ${(props) =>
      props.theme.exui.components.sidebarItem.hover.shadow};
    opacity: ${(props) =>
      props.theme.exui.components.sidebarItem.hover.opacity};
  }

  &:active {
    --background: ${(props) =>
      props.theme.exui.components.sidebarItem.active.background};
    --foreground: ${(props) =>
      props.theme.exui.components.sidebarItem.active.foreground};
  }

  &[aria-current="page"] ${Actions} {
    --background: ${(props) =>
      props.theme.exui.components.sidebarItem.active.background};
  }

  ${(props) => props.$isActiveDrop && `--background: ${props.theme.exui.control.primary};`}

  display: flex;
  position: relative;
  text-overflow: ellipsis;
  font-weight: ${(props) =>
    props.$nested
      ? props.theme.exui.components.sidebarItem.nested.fontWeight
      : props.theme.exui.components.sidebarItem.default.fontWeight};
  padding-block: ${(props) =>
    isMobile()
      ? "12px"
      : props.theme.exui.components.sidebarItem.default.paddingBlock};
  padding-inline: ${(props) =>
    props.theme.exui.components.sidebarItem.default.paddingInline};
  border-radius: ${(props) =>
    props.theme.exui.components.sidebarItem.default.radius};
  min-height: ${(props) =>
    props.$nested
      ? props.theme.exui.components.sidebarItem.nested.minHeight
      : props.theme.exui.components.sidebarItem.default.minHeight};
  user-select: none;
  white-space: nowrap;
  background: var(--background);
  color: ${(props) =>
    props.$isActiveDrop
      ? props.theme.exui.control.primaryForeground
      : "var(--foreground)"};
  font-size: ${(props) =>
    props.$nested
      ? props.theme.exui.components.sidebarItem.nested.fontSize
      : props.theme.exui.components.sidebarItem.default.fontSize};
  cursor: var(--pointer);
  overflow: hidden;
  border: 1px solid
    ${(props) => props.theme.exui.components.sidebarItem.default.border};
  box-shadow: ${(props) =>
    props.theme.exui.components.sidebarItem.default.shadow};
  opacity: ${(props) =>
    props.theme.exui.components.sidebarItem.default.opacity};
  width: 100%;
  ${undraggableOnDesktop()}

  &:focus-visible {
    outline: none;
    color: ${(props) =>
      props.theme.exui.components.sidebarItem.focus.foreground};
    border-color: ${(props) =>
      props.theme.exui.components.sidebarItem.focus.border};
    box-shadow: ${(props) =>
      props.theme.exui.components.sidebarItem.focus.shadow};
    background: ${(props) =>
      props.theme.exui.components.sidebarItem.focus.background};
    opacity: ${(props) =>
      props.theme.exui.components.sidebarItem.focus.opacity};
  }

  &:active {
    color: ${(props) =>
      props.$isActiveDrop
        ? props.theme.exui.control.primaryForeground
        : props.theme.exui.components.sidebarItem.active.foreground};
    background: ${(props) =>
      props.$isActiveDrop
        ? props.theme.exui.control.primary
        : props.theme.exui.components.sidebarItem.active.background};
    border-color: ${(props) =>
      props.theme.exui.components.sidebarItem.active.border};
    box-shadow: ${(props) =>
      props.theme.exui.components.sidebarItem.active.shadow};
    opacity: ${(props) =>
      props.theme.exui.components.sidebarItem.active.opacity};
  }

  ${(props) =>
    props.$isDraft &&
    css`
      &:after {
        content: "";
        position: absolute;
        inset: 0;
        pointer-events: none;
        border-radius: ${props.theme.exui.components.sidebarItem.default
          .radius};
        border: 1.5px dashed ${props.theme.sidebarDraftBorder};
      }
    `}

  /**
   * OUTLINE ICON BLOCK
   * drag-target fill previously applied to every SVG.
   */
  svg:not(.lucide) {
    ${(props) =>
      props.$isActiveDrop
        ? `fill: ${props.theme.exui.control.primaryForeground};`
        : ""}
    transition: fill 50ms;
  }

  svg.lucide {
    ${(props) =>
      props.$isActiveDrop
        ? `color: ${props.theme.exui.control.primaryForeground};`
        : ""}
    transition: color 50ms;
  }

  &: ${hover},
  &:has([data-state="open"]) {
    ${HiddenDisclosure} {
      display: block;
    }
    ${HiddenDisclosure} + ${IconWrapper} {
      visibility: hidden;
      opacity: 0;
      width: 0;
    }
  }

  ${breakpoint("tablet")`
    padding-block: ${(props: ThemeProps<DefaultTheme> & LinkStyleProps) =>
      props.theme.exui.components.sidebarItem.default.paddingBlock};
    padding-inline-end: ${(props: ThemeProps<DefaultTheme> & LinkStyleProps) =>
      props.theme.exui.components.sidebarItem.default.paddingInline};
  `}

  @media (hover: hover) {
    &:hover ${Actions},
    &:active ${Actions},
    &:has([data-state="open"]) ${Actions} {
      visibility: visible;

      svg {
        opacity: 0.75;
      }
    }

  }

  ${(props) =>
    props.$disabled &&
    css`
      pointer-events: none;
      cursor: default;
      color: ${props.theme.exui.components.sidebarItem.disabled.foreground};
      background: ${props.theme.exui.components.sidebarItem.disabled
        .background};
      border-color: ${props.theme.exui.components.sidebarItem.disabled.border};
      box-shadow: ${props.theme.exui.components.sidebarItem.disabled.shadow};
      opacity: ${props.theme.exui.components.sidebarItem.disabled.opacity};
    `}

  & ${Actions} {
    ${NudeButton} {
      background: transparent;

      &:hover,
      &[aria-expanded="true"] {
        background: ${s("sidebarControlHoverBackground")};
      }
    }
  }
`;

const Label = styled.div<{ $ellipsis: boolean }>`
  position: relative;
  width: 100%;
  line-height: 24px;
  margin-inline-start: 2px;
  min-width: 0;
  text-align: start;

  ${(props) => props.$ellipsis && ellipsis()}

  * {
    unicode-bidi: plaintext;
  }
`;

export default React.forwardRef<HTMLAnchorElement, Props>(SidebarLink);
