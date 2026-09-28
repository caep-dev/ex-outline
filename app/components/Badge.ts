import { transparentize } from "polished";
import styled from "styled-components";

const Badge = styled.span<{ yellow?: boolean; primary?: boolean }>`
  padding: 1.5px 5.5px;
  margin: 0 2px;
  background: ${({ yellow, primary, theme }) =>
    yellow
      ? transparentize(0.85, theme.exui.feedback.warning)
      : primary
        ? transparentize(0.85, theme.accent)
        : "transparent"};
  color: ${({ primary, yellow, theme }) =>
    primary
      ? theme.accent
      : yellow
        ? theme.exui.feedback.warning
        : theme.textTertiary};
  border: 1px solid
    ${({ yellow, primary, theme }) =>
      yellow
        ? transparentize(0.25, theme.exui.feedback.warning)
        : primary
          ? transparentize(0.25, theme.accent)
          : theme.textTertiary};
  border-radius: ${(props) => props.theme.exui.radii.extraLarge};
  font-size: ${(props) => props.theme.exui.typography.smallFontSize};
  font-weight: ${(props) => props.theme.exui.typography.fontWeightMedium};
  user-select: none;
  white-space: nowrap;
`;

export default Badge;
