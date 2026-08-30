import type { LocationDescriptor } from "history";
import { DisclosureIcon } from "outline-icons";
import * as React from "react";
import styled from "styled-components";
import type { DefaultTheme, ThemeProps } from "styled-components";
import type { Props as ActionButtonProps } from "~/components/ActionButton";
import ActionButton from "~/components/ActionButton";
import { undraggableOnDesktop } from "~/styles";

type RealProps = {
  $fullwidth?: boolean;
  $borderOnHover?: boolean;
  $neutral?: boolean;
  $danger?: boolean;
  $iconOnly?: boolean;
};

const getButtonVariant = (props: RealProps & ThemeProps<DefaultTheme>) => {
  if (props.$danger) {
    return props.theme.exui.components.button.danger;
  }
  if (props.$neutral && props.$borderOnHover) {
    return props.theme.exui.components.button.ghost;
  }
  if (props.$neutral) {
    return props.theme.exui.components.button.outline;
  }
  return props.theme.exui.components.button.primary;
};

const RealButton = styled(ActionButton)<RealProps>`
  display: ${(props) => (props.$fullwidth ? "block" : "inline-flex")};
  width: ${(props) =>
    props.$fullwidth
      ? "100%"
      : props.$iconOnly
        ? props.theme.exui.components.button.icon.height
        : "auto"};
  margin: 0;
  padding: 0;
  border: 1px solid ${(props) => getButtonVariant(props).default.border};
  background: ${(props) => getButtonVariant(props).default.background};
  color: ${(props) => getButtonVariant(props).default.foreground};
  box-shadow: ${(props) => getButtonVariant(props).default.shadow};
  opacity: ${(props) => getButtonVariant(props).default.opacity};
  border-radius: ${(props) =>
    props.theme.exui.components.button.default.radius};
  font-family: ${(props) =>
    props.theme.exui.components.button.default.fontFamily};
  font-size: ${(props) => props.theme.exui.components.button.default.fontSize};
  font-weight: ${(props) =>
    props.theme.exui.components.button.default.fontWeight};
  line-height: ${(props) =>
    props.theme.exui.components.button.default.lineHeight};
  height: ${(props) => props.theme.exui.components.button.default.height};
  text-decoration: none;
  flex-shrink: 0;
  cursor: var(--pointer);
  user-select: none;
  appearance: none !important;
  transition:
    background 200ms ease-out,
    border-color 200ms ease-out,
    color 200ms ease-out;
  ${undraggableOnDesktop()}

  &::-moz-focus-inner {
    padding: 0;
    border: 0;
  }

  &:hover:not(:disabled),
  &[aria-expanded="true"] {
    background: ${(props) => getButtonVariant(props).hover.background};
    color: ${(props) => getButtonVariant(props).hover.foreground};
    border-color: ${(props) => getButtonVariant(props).hover.border};
    box-shadow: ${(props) => getButtonVariant(props).hover.shadow};
    opacity: ${(props) => getButtonVariant(props).hover.opacity};
    transition: background 0s;
  }

  &:active:not(:disabled) {
    background: ${(props) => getButtonVariant(props).active.background};
    color: ${(props) => getButtonVariant(props).active.foreground};
    border-color: ${(props) => getButtonVariant(props).active.border};
    box-shadow: ${(props) => getButtonVariant(props).active.shadow};
    opacity: ${(props) => getButtonVariant(props).active.opacity};
  }

  &:focus-visible {
    outline: none;
    background: ${(props) => getButtonVariant(props).focus.background};
    color: ${(props) => getButtonVariant(props).focus.foreground};
    border-color: ${(props) => getButtonVariant(props).focus.border};
    box-shadow: ${(props) => getButtonVariant(props).focus.shadow};
    opacity: ${(props) => getButtonVariant(props).focus.opacity};
  }

  &:disabled {
    cursor: default;
    pointer-events: none;
    color: ${(props) => getButtonVariant(props).disabled.foreground};
    background: ${(props) => getButtonVariant(props).disabled.background};
    border-color: ${(props) => getButtonVariant(props).disabled.border};
    box-shadow: ${(props) => getButtonVariant(props).disabled.shadow};
    opacity: ${(props) => getButtonVariant(props).disabled.opacity};

    svg {
      fill: currentColor;
    }
  }
`;

const Label = styled.span`
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
`;

export const Inner = styled.span<{
  disclosure?: boolean;
  hasIcon?: boolean;
  hasText?: boolean;
}>`
  display: flex;
  width: ${(props) => (props.hasIcon && !props.hasText ? "100%" : "auto")};
  height: 100%;
  padding-inline: ${(props) =>
    props.hasIcon && !props.hasText
      ? props.theme.exui.components.button.icon.paddingInline
      : props.theme.exui.components.button.default.paddingInline};
  gap: ${(props) =>
    props.hasIcon && !props.hasText
      ? props.theme.exui.components.button.icon.gap
      : props.theme.exui.components.button.default.gap};
  justify-content: center;
  align-items: center;
  min-height: ${(props) => props.theme.exui.components.button.default.height};

  > svg {
    width: ${(props) => props.theme.exui.components.button.default.iconSize};
    height: ${(props) => props.theme.exui.components.button.default.iconSize};
    flex-shrink: 0;
  }
`;

export type Props<T> = ActionButtonProps & {
  icon?: React.ReactNode;
  children?: React.ReactNode;
  disclosure?: boolean;
  neutral?: boolean;
  danger?: boolean;
  fullwidth?: boolean;
  as?: T;
  to?: LocationDescriptor;
  borderOnHover?: boolean;
  hideIcon?: boolean;
  href?: string;
  "data-on"?: string;
  "data-event-category"?: string;
  "data-event-action"?: string;
};

const Button = <T extends React.ElementType = "button">(
  props: Props<T> & React.ComponentPropsWithoutRef<T>,
  ref: React.Ref<HTMLButtonElement>
) => {
  const {
    type,
    children,
    value,
    disclosure,
    neutral,
    action,
    icon,
    borderOnHover,
    hideIcon,
    fullwidth,
    danger,
    ...rest
  } = props;
  const hasText = !!children || value !== undefined;
  const ic = hideIcon ? undefined : (action?.icon ?? icon);
  const hasIcon = ic !== undefined;

  return (
    <RealButton
      type={type || "button"}
      ref={ref}
      $neutral={neutral}
      action={action}
      $danger={danger}
      $fullwidth={fullwidth}
      $borderOnHover={borderOnHover}
      $iconOnly={hasIcon && !hasText}
      {...rest}
    >
      <Inner hasIcon={hasIcon} hasText={hasText} disclosure={disclosure}>
        {hasIcon && ic}
        {hasText && <Label>{children || value}</Label>}
        {disclosure && <StyledDisclosureIcon />}
      </Inner>
    </RealButton>
  );
};

const StyledDisclosureIcon = styled(DisclosureIcon)`
  opacity: 0.8;
`;

export default React.forwardRef(Button);
