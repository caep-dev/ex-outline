import styled from "styled-components";
import { glassSurface } from "@shared/styles/glass";
import Button from "~/components/Button";

const ToggleButton = styled(Button).attrs({
  neutral: true,
  borderOnHover: true,
})`
  flex-shrink: 0;
  opacity: 1;
  ${glassSurface}
  box-shadow:
    ${(props) => props.theme.exui.glass.shadow},
    inset 0 1px 1px rgba(255, 255, 255, 0.3),
    ${(props) => props.theme.exui.shadow.medium};

  [dir="rtl"] & svg {
    transform: scaleX(-1);
  }
`;

export default ToggleButton;
