/**
 * Reusable components for InputSelect abstraction.
 */

import { CheckmarkIcon } from "outline-icons";
import { forwardRef } from "react";
import styled, { css } from "styled-components";
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
  font-weight: ${(props) =>
    props.theme.exui.components.formControl.base.fontWeight};
  font-family: ${(props) =>
    props.theme.exui.components.formControl.base.fontFamily};
  font-size: ${(props) =>
    props.theme.exui.components.formControl.base.fontSize};
  height: ${(props) => props.theme.exui.components.formControl.base.height};
  border-radius: ${(props) =>
    props.theme.exui.components.formControl.base.radius};
  border-color: ${(props) =>
    props.theme.exui.components.formControl.base.border};
  background: ${(props) =>
    props.theme.exui.components.formControl.base.background};
  color: ${(props) => props.theme.exui.components.formControl.base.foreground};
  box-shadow: ${(props) => props.theme.exui.components.formControl.base.shadow};
  text-transform: none;
  width: 100%;
  cursor: var(--pointer);

  ${(props) =>
    Object.entries({
      "&:hover:not(:disabled)": props.theme.exui.components.formControl.hover,
      "&:focus-visible": props.theme.exui.components.formControl.focus,
      "&:disabled": props.theme.exui.components.formControl.disabled,
      '&[aria-invalid="true"]': props.theme.exui.components.formControl.invalid,
    }).map(
      ([selector, recipe]) => css`
        ${selector} {
          background: ${recipe.background};
          color: ${recipe.foreground};
          border-color: ${recipe.border};
          box-shadow: ${recipe.shadow};
          opacity: ${recipe.opacity};
        }
      `
    )}

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
    line-height: ${(props) =>
      props.theme.exui.components.formControl.base.lineHeight};
    padding: ${(props) =>
        props.theme.exui.components.formControl.base.paddingBlock}
      ${(props) => props.theme.exui.components.formControl.base.paddingInline};
    gap: ${(props) => props.theme.exui.components.formControl.base.gap};
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
  font-size: ${(props) => props.theme.exui.components.menu.item.fontSize};
  cursor: var(--pointer);
  color: ${(props) => props.theme.exui.components.menu.item.default.foreground};
  background: ${(props) =>
    props.theme.exui.components.menu.item.default.background};
  margin: 0;
  padding: ${(props) => props.theme.exui.components.menu.item.paddingBlock}
    ${(props) => props.theme.exui.components.menu.item.paddingInline};
  border: 0;
  border-radius: ${(props) => props.theme.exui.components.menu.item.radius};
  outline: 0;
  user-select: none;
  white-space: nowrap;

  svg {
    flex-shrink: 0;
  }

  &[data-highlighted] {
    color: ${(props) => props.theme.exui.components.menu.item.hover.foreground};
    background: ${(props) =>
      props.theme.exui.components.menu.item.hover.background};
  }

  &[data-disabled] {
    color: ${(props) =>
      props.theme.exui.components.menu.item.disabled.foreground};
    background: ${(props) =>
      props.theme.exui.components.menu.item.disabled.background};
    opacity: ${(props) =>
      props.theme.exui.components.menu.item.disabled.opacity};
    pointer-events: none;
  }

  ${Text} {
    color: inherit;
  }

  &[data-state="checked"] {
    ${IconSpacer} {
      display: none;
    }
  }
`;

const IndicatorContainer = styled.span`
  width: 24px;
  height: 24px;
`;
