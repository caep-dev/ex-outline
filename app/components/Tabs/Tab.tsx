import type { LocationDescriptor } from "history";
import * as React from "react";
import styled, { css, useTheme } from "styled-components";
import { hover } from "@shared/styles";
import NavLink from "~/components/NavLink";

interface BaseProps {
  /**
   * If true, the tab will only be active if the path matches exactly.
   */
  exact?: boolean;
  /**
   * If true, the tab will only be active if the query string matches exactly.
   * By default query string parameters are ignored for location matching.
   */
  exactQueryString?: boolean;
  children?: React.ReactNode;
}

interface LinkProps extends BaseProps {
  /**
   * The path to match against the current location.
   */
  to: LocationDescriptor;
  /**
   * Optional click handler called when the tab is clicked (in addition to navigation).
   */
  onClick?: () => void;
  active?: never;
}

interface ButtonProps
  extends BaseProps, React.ButtonHTMLAttributes<HTMLButtonElement> {
  /**
   * Click handler for button mode, optional when the parent handles selection.
   */
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  /**
   * Whether the tab is currently active (only used in button mode).
   */
  active: boolean;
  to?: never;
}

type Props = LinkProps | ButtonProps;

const tabStyles = css`
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  height: 100%;
  gap: ${(props) => props.theme.exui.components.tabs.trigger.gap};
  padding-block: ${(props) =>
    props.theme.exui.components.tabs.trigger.paddingBlock};
  padding-inline: ${(props) =>
    props.theme.exui.components.tabs.trigger.paddingInline};
  border: 1px solid
    ${(props) => props.theme.exui.components.tabs.trigger.default.border};
  border-radius: ${(props) => props.theme.exui.radii.full};
  background: ${(props) =>
    props.theme.exui.components.tabs.trigger.default.background};
  color: ${(props) =>
    props.theme.exui.components.tabs.trigger.default.foreground};
  box-shadow: ${(props) =>
    props.theme.exui.components.tabs.trigger.default.shadow};
  opacity: ${(props) =>
    props.theme.exui.components.tabs.trigger.default.opacity};
  font-weight: ${(props) =>
    props.theme.exui.components.tabs.trigger.fontWeight};
  font-size: ${(props) => props.theme.exui.components.tabs.trigger.fontSize};
  cursor: var(--pointer);
  user-select: none;
  text-decoration: none;
  white-space: nowrap;
  transition: all 150ms cubic-bezier(0.4, 0, 0.2, 1);

  &:focus-visible {
    outline: none;
    color: ${(props) =>
      props.theme.exui.components.tabs.trigger.focus.foreground};
    background: ${(props) =>
      props.theme.exui.components.tabs.trigger.focus.background};
    border-color: ${(props) =>
      props.theme.exui.components.tabs.trigger.focus.border};
    box-shadow: ${(props) =>
      props.theme.exui.components.tabs.trigger.focus.shadow};
    opacity: ${(props) =>
      props.theme.exui.components.tabs.trigger.focus.opacity};
  }
`;

const TabLink = styled(NavLink)`
  ${tabStyles}
  &: ${hover} {
    color: ${(props) =>
      props.theme.exui.components.tabs.trigger.hover.foreground};
    background: ${(props) =>
      props.theme.exui.components.tabs.trigger.hover.background};
    border-color: ${(props) =>
      props.theme.exui.components.tabs.trigger.hover.border};
    box-shadow: ${(props) =>
      props.theme.exui.components.tabs.trigger.hover.shadow};
    opacity: ${(props) =>
      props.theme.exui.components.tabs.trigger.hover.opacity};
  }
`;

const TabButton = styled.button<{ $active: boolean }>`
  ${tabStyles}
  color: ${({ $active, theme }) =>
    $active
      ? theme.exui.components.tabs.trigger.selected.foreground
      : theme.exui.components.tabs.trigger.default.foreground};
  background: ${({ $active, theme }) =>
    $active
      ? theme.exui.components.tabs.trigger.selected.background
      : theme.exui.components.tabs.trigger.default.background};
  border-color: ${({ $active, theme }) =>
    $active
      ? theme.exui.components.tabs.trigger.selected.border
      : theme.exui.components.tabs.trigger.default.border};
  box-shadow: ${({ $active, theme }) =>
    $active
      ? theme.exui.components.tabs.trigger.selected.shadow
      : theme.exui.components.tabs.trigger.default.shadow};
  opacity: ${({ $active, theme }) =>
    $active
      ? theme.exui.components.tabs.trigger.selected.opacity
      : theme.exui.components.tabs.trigger.default.opacity};

  &: ${hover} {
    color: ${({ $active, theme }) =>
      $active
        ? theme.exui.components.tabs.trigger.selected.foreground
        : theme.exui.components.tabs.trigger.hover.foreground};
    background: ${({ $active, theme }) =>
      $active
        ? theme.exui.components.tabs.trigger.selected.background
        : theme.exui.components.tabs.trigger.hover.background};
    border-color: ${({ $active, theme }) =>
      $active
        ? theme.exui.components.tabs.trigger.selected.border
        : theme.exui.components.tabs.trigger.hover.border};
    box-shadow: ${({ $active, theme }) =>
      $active
        ? theme.exui.components.tabs.trigger.selected.shadow
        : theme.exui.components.tabs.trigger.hover.shadow};
    opacity: ${({ $active, theme }) =>
      $active
        ? theme.exui.components.tabs.trigger.selected.opacity
        : theme.exui.components.tabs.trigger.hover.opacity};
  }

  &:disabled {
    color: ${(props) =>
      props.theme.exui.components.tabs.trigger.disabled.foreground};
    background: ${(props) =>
      props.theme.exui.components.tabs.trigger.disabled.background};
    border-color: ${(props) =>
      props.theme.exui.components.tabs.trigger.disabled.border};
    box-shadow: ${(props) =>
      props.theme.exui.components.tabs.trigger.disabled.shadow};
    opacity: ${(props) =>
      props.theme.exui.components.tabs.trigger.disabled.opacity};
  }
`;

/**
 * A single tab rendered either as a link matched against the current location,
 * or as a button in controlled mode.
 * A forwarded ref is only attached in button mode.
 */
export const Tab = React.forwardRef<HTMLButtonElement, Props>(function Tab(
  props: Props,
  ref
) {
  const { children, exact, exactQueryString } = props;
  const theme = useTheme();
  const activeStyle = {
    color: theme.exui.components.tabs.trigger.selected.foreground,
    background: theme.exui.components.tabs.trigger.selected.background,
    borderColor: theme.exui.components.tabs.trigger.selected.border,
    boxShadow: theme.exui.components.tabs.trigger.selected.shadow,
    opacity: theme.exui.components.tabs.trigger.selected.opacity,
  };

  // Button mode - controlled by onClick and active props (no `to` prop)
  if ("active" in props && !("to" in props)) {
    const {
      active,
      exact: _exact,
      exactQueryString: _exactQueryString,
      ...rest
    } = props;

    return (
      <TabButton {...rest} ref={ref} type="button" $active={active}>
        {children}
      </TabButton>
    );
  }

  // Link mode - controlled by react-router
  const { to, ...rest } = props as LinkProps;
  return (
    <TabLink
      {...rest}
      to={to}
      exact={exact || exactQueryString}
      activeStyle={activeStyle}
    >
      {() => children}
    </TabLink>
  );
});
