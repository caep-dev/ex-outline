import styled from "styled-components";
import Button, { Inner } from "./Button";

const ButtonLarge = styled(Button)`
  /* The ExUI density scale only defines standard and compact, so the large
     button keeps its own height while sourcing padding from the scale. */
  height: 40px;

  ${Inner} {
    padding: 4px
      ${(props) => props.theme.exui.density.standard.controlPaddingInline};
  }
`;

export default ButtonLarge;
