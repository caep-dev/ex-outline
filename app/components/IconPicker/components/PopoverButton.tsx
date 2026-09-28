import styled, { css } from "styled-components";
import { s, hover } from "@shared/styles";
import NudeButton from "~/components/NudeButton";

export const PopoverButton = styled(NudeButton)<{ $borderOnHover?: boolean }>`
  &: ${hover},
  &:active,
  &[aria-expanded= "true"] {
    opacity: 1 !important;

    ${({ $borderOnHover }) =>
      $borderOnHover &&
      css`
        background: ${s("buttonNeutralBackground")};
        box-shadow:
          ${(props) => props.theme.exui.shadow.small},
          ${s("buttonNeutralBorder")} 0 0 0 1px inset;
      `};
  }
`;
