import styled from "styled-components";
import Button, { Inner } from "./Button";

const ButtonSmall = styled(Button)`
  /* The token contract has no typography step below smallFontSize, so the small
     button keeps its own font size to stay visually distinct from Button. */
  font-size: 13px;
  height: ${(props) => props.theme.exui.density.compact.controlHeight};

  ${Inner} {
    padding: 0
      ${(props) => props.theme.exui.density.compact.controlPaddingInline};
    line-height: ${(props) => props.theme.exui.density.compact.controlHeight};
    min-height: ${(props) => props.theme.exui.density.compact.controlHeight};
  }
`;

export default ButtonSmall;
