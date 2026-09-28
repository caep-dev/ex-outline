import styled from "styled-components";
import { s } from "@shared/styles";

export const UnreadBadge = styled.div`
  width: 8px;
  height: 8px;
  background: ${s("accent")};
  border-radius: ${(props) => props.theme.exui.radii.full};
  align-self: center;
  position: absolute;
  right: 12px;
`;
