import * as OneTimePasswordField from "@radix-ui/react-one-time-password-field";
import * as React from "react";
import styled from "styled-components";
import { s } from "@shared/styles";

type Props = React.ComponentProps<typeof OneTimePasswordRoot> & {
  /** The length of the OTP */
  length?: number;
  /**
   * Whether to accept uppercase letters in addition to digits. Lowercase input
   * is normalized to uppercase. Defaults to numeric only.
   */
  alphanumeric?: boolean;
};

const sanitizeAlphanumeric = (value: string) =>
  value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

export const OneTimePasswordInput = React.forwardRef(
  function OneTimePasswordInput_(
    { length = 6, alphanumeric, ...rest }: Props,
    ref: React.RefObject<HTMLInputElement>
  ) {
    const alphanumericProps = alphanumeric
      ? {
          validationType: "none" as const,
          sanitizeValue: sanitizeAlphanumeric,
        }
      : undefined;

    return (
      <OneTimePasswordRoot {...alphanumericProps} {...rest}>
        {Array.from({ length }, (_, i) => (
          <OneTimePasswordInputField key={i} />
        ))}
        <OneTimePasswordField.HiddenInput ref={ref} />
      </OneTimePasswordRoot>
    );
  }
);

const OneTimePasswordRoot = styled(OneTimePasswordField.Root)`
  display: flex;
  gap: 0.5rem;
  flex-wrap: nowrap;
  justify-content: space-between;
`;

const OneTimePasswordInputField = styled(OneTimePasswordField.Input)`
  all: unset;
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  border-radius: ${(props) =>
    props.theme.exui.components.formControl.base.radius};
  font-size: ${(props) =>
    props.theme.exui.components.formControl.base.fontSize};
  color: ${(props) => props.theme.exui.components.formControl.base.foreground};
  background: ${(props) =>
    props.theme.exui.components.formControl.base.background};
  border: 1px solid
    ${(props) => props.theme.exui.components.formControl.base.border};
  padding: 0;
  height: ${(props) => props.theme.exui.components.formControl.base.height};
  width: ${(props) => props.theme.exui.components.formControl.base.height};
  min-width: 0;
  line-height: 1;
  transition: box-shadow 0.1s ease-in-out;

  &:focus {
    border-color: ${(props) =>
      props.theme.exui.components.formControl.focus.border};
    box-shadow: ${(props) =>
      props.theme.exui.components.formControl.focus.shadow};
  }
  &:disabled {
    opacity: ${(props) =>
      props.theme.exui.components.formControl.disabled.opacity};
    color: ${(props) =>
      props.theme.exui.components.formControl.disabled.foreground};
  }
  &[aria-invalid="true"] {
    box-shadow: ${(props) =>
      props.theme.exui.components.formControl.invalid.shadow};
  }
  &::selection {
    background-color: ${s("background")};
    color: ${s("text")};
  }
`;
