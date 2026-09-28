import styled from "styled-components";
import { s } from "@shared/styles";

const Input = styled.input`
  font-size: ${(props) =>
    props.theme.exui.components.formControl.base.fontSize};
  background: ${(props) =>
    props.theme.exui.components.formControl.base.background};
  color: ${s("text")};
  border-radius: ${(props) =>
    props.theme.exui.components.formControl.base.radius};
  padding: 3px 8px;
  border: 0;
  margin: 0;
  outline: none;
  flex-grow: 1;
  min-width: 0;

  &:focus-visible {
    box-shadow: ${(props) =>
      props.theme.exui.components.formControl.focus.shadow};
  }

  &::placeholder {
    color: ${(props) =>
      props.theme.exui.components.formControl.base.placeholder};
  }

  @media (hover: none) and (pointer: coarse) {
    font-size: 16px;
    height: 34px;
  }
`;

export default Input;
