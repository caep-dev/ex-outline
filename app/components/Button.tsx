import type { LocationDescriptor } from "history";
import { DisclosureIcon } from "outline-icons";
import * as React from "react";
import styled from "styled-components";
import type { Props as ActionButtonProps } from "~/components/ActionButton";
import ActionButton from "~/components/ActionButton";
import { undraggableOnDesktop } from "~/styles";

type RealProps = {
  $fullwidth?: boolean;
  $borderOnHover?: boolean;
  $neutral?: boolean;
  $danger?: boolean;
};

const RealButton = styled(ActionButton)<RealProps>`
  display: ${(props) => (props.$fullwidth ? "block" : "inline-block")};
  width: ${(props) => (props.$fullwidth ? "100%" : "auto")};
  margin: 0;
  padding: 0;
  border: 0;
  background: ${(props) => props.theme.exui.control.primary};
  color: ${(props) => props.theme.exui.control.primaryForeground};
  box-shadow: ${(props) => props.theme.exui.shadow.small};
  border-radius: ${(props) => props.theme.exui.density.standard.controlRadius};
  font-family: ${(props) => props.theme.exui.typography.fontFamily};
  font-size: ${(props) => props.theme.exui.typography.smallFontSize};
  font-weight: ${(props) => props.theme.exui.typography.fontWeightMedium};
  height: ${(props) => props.theme.exui.density.standard.controlHeight};
  text-decoration: none;
  flex-shrink: 0;
  cursor: var(--pointer);
  user-select: none;
  appearance: none !important;
  transition: background 200ms ease-out;
  ${undraggableOnDesktop()}

  &::-moz-focus-inner {
    padding: 0;
    border: 0;
  }

  &:hover:not(:disabled),
  &[aria-expanded="true"] {
    background: ${(props) => props.theme.exui.control.primaryHover};
    transition: background 0s;
  }

  &:disabled {
    cursor: default;
    pointer-events: none;
    color: ${(props) => props.theme.exui.control.primaryForeground};
    background: ${(props) => props.theme.exui.control.primaryDisabled};

    svg {
      fill: currentColor;
    }
  }

  ${(props) =>
    props.$neutral &&
    `
    background: inherit;
    color: ${props.theme.exui.control.neutralForeground};
    box-shadow: ${
      props.$borderOnHover
        ? "none"
        : `${props.theme.exui.shadow.small}, ${props.theme.exui.surface.border} 0 0 0 1px inset`
    };

    &:hover:not(:disabled),
    &[aria-expanded="true"] {
      background: ${
        props.$borderOnHover
          ? props.theme.exui.control.neutral
          : props.theme.exui.control.neutralHover
      };
      box-shadow: ${`${props.theme.exui.shadow.small}, ${props.theme.exui.surface.border} 0 0 0 1px inset`};
      transition: background 0s;
    }

    &:focus-visible {
      box-shadow: ${`${props.theme.exui.shadow.small}, ${props.theme.exui.control.focusRing} 0 0 0 1px inset`};
    }

    &:disabled {
      color: ${props.theme.exui.surface.foregroundTertiary};
      background: none;

      svg {
        fill: currentColor;
      }
    }
  `}

  ${(props) =>
    props.$danger &&
    `
      background: ${props.theme.exui.control.danger};
      color: ${props.theme.exui.control.dangerForeground};

      &:hover:not(:disabled),
      &[aria-expanded="true"] {
        background: ${props.theme.exui.control.dangerHover};
        transition: background 0s;
      }

      &:disabled {
        background: ${props.theme.exui.control.disabled};
      }

      &:focus-visible {
        outline-color: ${props.theme.exui.control.dangerActive} !important;
      }
  `};
`;

const Label = styled.span<{ hasIcon?: boolean }>`
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;

  ${(props) => props.hasIcon && "padding-inline-start: 4px;"};
`;

export const Inner = styled.span<{
  disclosure?: boolean;
  hasIcon?: boolean;
  hasText?: boolean;
}>`
  display: flex;
  padding: 0
    ${(props) => props.theme.exui.density.standard.controlPaddingInline};
  padding-inline-end: ${(props) =>
    props.disclosure
      ? "2px"
      : props.theme.exui.density.standard.controlPaddingInline};
  line-height: 24px;
  justify-content: center;
  align-items: center;
  min-height: ${(props) => props.theme.exui.density.standard.controlHeight};

  ${(props) => props.hasIcon && props.hasText && "padding-inline-start: 4px;"};
  ${(props) => props.hasIcon && !props.hasText && "padding: 0 4px;"};
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
      {...rest}
    >
      <Inner hasIcon={hasIcon} hasText={hasText} disclosure={disclosure}>
        {hasIcon && ic}
        {hasText && <Label hasIcon={hasIcon}>{children || value}</Label>}
        {disclosure && <StyledDisclosureIcon />}
      </Inner>
    </RealButton>
  );
};

const StyledDisclosureIcon = styled(DisclosureIcon)`
  opacity: 0.8;
`;

export default React.forwardRef(Button);
