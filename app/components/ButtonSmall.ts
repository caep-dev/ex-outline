import styled from "styled-components";
import Button, { Inner } from "./Button";

const ButtonSmall = styled(Button)`
  height: ${(props) => props.theme.exui.components.button.small.height};
  border-radius: ${(props) => props.theme.exui.components.button.small.radius};
  font-family: ${(props) =>
    props.theme.exui.components.button.small.fontFamily};
  font-size: ${(props) => props.theme.exui.components.button.small.fontSize};
  font-weight: ${(props) =>
    props.theme.exui.components.button.small.fontWeight};
  line-height: ${(props) =>
    props.theme.exui.components.button.small.lineHeight};

  ${Inner} {
    padding-inline: ${(props) =>
      props.theme.exui.components.button.small.paddingInline};
    gap: ${(props) => props.theme.exui.components.button.small.gap};
    min-height: ${(props) => props.theme.exui.components.button.small.height};

    > svg {
      width: ${(props) => props.theme.exui.components.button.small.iconSize};
      height: ${(props) => props.theme.exui.components.button.small.iconSize};
    }
  }
`;

export default ButtonSmall;
