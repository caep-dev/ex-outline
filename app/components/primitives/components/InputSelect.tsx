/**
 * Reusable components for InputSelect abstraction.
 */

import { CheckmarkIcon } from "outline-icons";
import { forwardRef } from "react";
import styled, { css } from "styled-components";
import breakpoint from "styled-components-breakpoint";
import Button, { Inner } from "~/components/Button";
import Flex from "~/components/Flex";
import Text from "~/components/Text";

export const SelectItem = forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<"div">
>((props, ref) => {
  const { children, ...rest } = props;

  return (
    <ItemContainer
      ref={ref}
      justify="space-between"
      align="center"
      gap={8}
      {...rest}
    >
      {children}
      <IconSpacer />
    </ItemContainer>
  );
});
SelectItem.displayName = "SelectItem";

export const SelectItemIndicator = forwardRef<
  HTMLSpanElement,
  React.ComponentPropsWithoutRef<"span">
>((props, ref) => (
  <IndicatorContainer ref={ref} {...props}>
    <CheckmarkIcon />
  </IndicatorContainer>
));
SelectItemIndicator.displayName = "SelectItemIndicator";

const IconSpacer = styled.div`
  width: 24px;
  height: 24px;
  flex-shrink: 0;
`;

export const SelectButton = styled(Button)<{ $nude?: boolean }>`
  display: block;
  font-weight: normal;
  text-transform: none;
  width: 100%;
  cursor: var(--pointer);

  &:hover:not(:disabled) {
    background: ${(props) => props.theme.exui.control.neutral};
  }

  &:focus-visible {
    outline: none;
  }

  ${(props) =>
    props.$nude &&
    css`
      border-color: transparent;
      box-shadow: none;
    `}

  ${Inner} {
    line-height: 28px;
    padding-inline-start: 12px;
    padding-inline-end: 4px;
  }

  svg {
    justify-self: flex-end;
    margin-inline-start: auto;
  }

  &[data-placeholder=""] {
    color: ${(props) => props.theme.exui.surface.placeholder};
  }
`;

const ItemContainer = styled(Flex)`
  position: relative;
  width: 100%;
  font-size: 16px;
  cursor: var(--pointer);
  color: ${(props) => props.theme.exui.overlay.menu.foreground};
  background: none;
  margin: 0;
  padding: 12px;
  border: 0;
  border-radius: ${(props) => props.theme.exui.radii.small};
  outline: 0;
  user-select: none;
  white-space: nowrap;

  svg {
    flex-shrink: 0;
  }

  @media (hover: hover) {
    &:hover,
    &:focus {
      color: ${(props) => props.theme.exui.overlay.menu.itemForegroundHover};
      background: ${(props) =>
        props.theme.exui.overlay.menu.itemBackgroundHover};

      svg {
        color: ${(props) => props.theme.exui.overlay.menu.itemForegroundHover};
        fill: ${(props) => props.theme.exui.overlay.menu.itemForegroundHover};
      }

      ${Text} {
        color: ${(props) => props.theme.exui.overlay.menu.foregroundDisabled};
      }
    }
  }

  &[data-state="checked"] {
    ${IconSpacer} {
      display: none;
    }
  }

  ${breakpoint("tablet")`
    font-size: 14px;
    padding: 4px;
    padding-inline-start: 8px;
  `}
`;

const IndicatorContainer = styled.span`
  width: 24px;
  height: 24px;
`;
