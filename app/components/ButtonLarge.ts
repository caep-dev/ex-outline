import styled from "styled-components";
import Button, { Inner } from "./Button";

const ButtonLarge = styled(Button)`
  height: ${(props) => props.theme.exui.components.button.large.height};
  border-radius: ${(props) => props.theme.exui.components.button.large.radius};
  font-family: ${(props) =>
    props.theme.exui.components.button.large.fontFamily};
  font-size: ${(props) => props.theme.exui.components.button.large.fontSize};
  font-weight: ${(props) =>
    props.theme.exui.components.button.large.fontWeight};
  line-height: ${(props) =>
    props.theme.exui.components.button.large.lineHeight};

  ${Inner} {
    padding-inline: ${(props) =>
      props.theme.exui.components.button.large.paddingInline};
    gap: ${(props) => props.theme.exui.components.button.large.gap};
    min-height: ${(props) => props.theme.exui.components.button.large.height};

    > svg {
      width: ${(props) => props.theme.exui.components.button.large.iconSize};
      height: ${(props) => props.theme.exui.components.button.large.iconSize};
    }
  }
`;

export default ButtonLarge;
