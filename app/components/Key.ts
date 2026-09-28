import styled from "styled-components";

type Props = {
  /** Set to true if displaying a single symbol character to disable monospace */
  symbol?: boolean;
};

const Key = styled.kbd<Props>`
  display: inline-block;
  padding: 0.25rem 0.375rem;
  font-size: ${(props) => props.theme.exui.typography.smallFontSize};
  font-family: ${(props) =>
    props.symbol
      ? props.theme.exui.typography.fontFamily
      : props.theme.exui.typography.fontFamilyMono};
  /* Disambiguation for "I" and slashed zero so "0" doesn't read as "O" */
  font-feature-settings: "cv08", "zero";
  line-height: 1;
  color: ${(props) => props.theme.exui.surface.foregroundSecondary};
  vertical-align: middle;
  background-color: ${(props) => props.theme.exui.surface.surfaceSecondary};
  border: solid 1px ${(props) => props.theme.exui.surface.border};
  border-radius: ${(props) => props.theme.exui.radii.small};
`;

export default Key;
