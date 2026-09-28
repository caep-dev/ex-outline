import * as RadixSwitch from "@radix-ui/react-switch";
import * as React from "react";
import styled from "styled-components";
import { LabelText } from "~/components/Input";
import Text from "~/components/Text";
import { undraggableOnDesktop } from "~/styles";

interface Props extends Omit<
  React.ComponentProps<typeof RadixSwitch.Root>,
  "checked" | "onCheckedChange" | "onChange"
> {
  /** Width of the switch. Defaults to the ExUI width (2.75rem). */
  width?: number;
  /** Height of the switch. Defaults to the ExUI height (1.25rem). */
  height?: number;
  /** An optional label for the switch */
  label?: string;
  /** Whether the label should be positioned on left or right. Defaults to right */
  labelPosition?: "left" | "right";
  /** An optional note to display below the switch */
  note?: React.ReactNode;
  /** Name of the input */
  name?: string;
  /** Whether the switch is checked */
  checked?: boolean;
  /** Whether the switch is disabled */
  disabled?: boolean;
  /** Callback when the switch state changes */
  onChange?: (checked: boolean) => void;
  inForm?: boolean;
}

function Switch(
  {
    width,
    height,
    labelPosition = "left",
    inForm = true,
    label,
    disabled,
    className,
    note,
    checked,
    onChange,
    ...props
  }: Props,
  ref: React.Ref<React.ElementRef<typeof RadixSwitch.Root>>
) {
  const handleCheckedChange = React.useCallback(
    (checkedState: boolean) => {
      if (onChange) {
        onChange(checkedState);
      }
    },
    [onChange]
  );

  const component = (
    <StyledSwitchRoot
      ref={ref}
      checked={checked}
      onCheckedChange={handleCheckedChange}
      disabled={disabled}
      width={width}
      height={height}
      className={label ? undefined : className}
      {...props}
    >
      <StyledSwitchThumb />
    </StyledSwitchRoot>
  );

  if (label) {
    return (
      <Wrapper $inForm={inForm}>
        <Label
          disabled={disabled}
          htmlFor={props.id}
          className={className}
          $labelPosition={labelPosition}
        >
          {component}
          <InlineLabelText>{label}</InlineLabelText>
        </Label>
        {note && (
          <Text
            type="secondary"
            size="small"
            style={{
              paddingRight: labelPosition === "left" ? (width ?? "2.75rem") : 0,
              paddingLeft: labelPosition === "right" ? (width ?? "2.75rem") : 0,
            }}
          >
            {note}
          </Text>
        )}
      </Wrapper>
    );
  }

  return component;
}

const Wrapper = styled.div<{ $inForm?: boolean }>`
  padding-bottom: ${(props) => (props.$inForm ? 8 : 0)}px;
  ${undraggableOnDesktop()}
`;

const InlineLabelText = styled(LabelText)`
  padding-bottom: 0;
  width: 100%;
`;

const Label = styled.label<{
  disabled?: boolean;
  $labelPosition: "left" | "right";
}>`
  display: flex;
  align-items: center;
  user-select: none;
  gap: 8px;

  ${(props) =>
    props.$labelPosition === "left" ? `flex-direction: row-reverse;` : ""}
  ${(props) => (props.disabled ? `opacity: 0.75;` : "")}
`;

const StyledSwitchThumb = styled(RadixSwitch.Thumb)`
  display: block;
  width: var(--switch-thumb-width);
  height: var(--switch-thumb-height);
  background-color: ${(props) =>
    props.theme.isDark
      ? props.theme.exui.surface.foreground
      : props.theme.exui.surface.background};
  border-radius: ${(props) => props.theme.exui.radii.full};
  box-shadow: ${(props) => props.theme.exui.shadow.small};
  transition: transform 0.2s;
  transform: translateX(0);

  &[data-state="checked"] {
    background-color: ${(props) => props.theme.exui.control.primaryForeground};
    transform: translateX(
      calc(var(--switch-width) - var(--switch-thumb-width) - 4px)
    );
  }

  [dir="rtl"] &[data-state="checked"] {
    transform: translateX(
      calc(var(--switch-thumb-width) + 4px - var(--switch-width))
    );
  }
`;

const StyledSwitchRoot = styled(RadixSwitch.Root)<{
  width?: number;
  height?: number;
}>`
  --switch-width: ${(props) =>
    props.width === undefined ? "2.75rem" : `${props.width}px`};
  --switch-height: ${(props) =>
    props.height === undefined ? "1.25rem" : `${props.height}px`};
  --switch-thumb-width: ${(props) =>
    props.height === undefined ? "1.5rem" : `${props.height + 4}px`};
  --switch-thumb-height: ${(props) =>
    props.height === undefined ? "1rem" : `${Math.max(0, props.height - 4)}px`};
  position: relative;
  display: inline-flex;
  align-items: center;
  width: var(--switch-width);
  height: var(--switch-height);
  background-color: ${(props) => props.theme.inputBackground};
  border-radius: ${(props) => props.theme.exui.radii.full};
  border: 2px solid transparent;
  cursor: var(--pointer);
  transition: background-color 0.2s;
  padding: 0;
  flex-shrink: 0;

  &:focus-visible {
    box-shadow: ${(props) => props.theme.exui.shadow.focus};
    outline: none;
  }

  &[data-state="checked"] {
    background-color: ${(props) => props.theme.exui.control.primary};
  }

  &:disabled {
    opacity: 0.5;
    cursor: default;
  }
`;
export default React.forwardRef(Switch);
