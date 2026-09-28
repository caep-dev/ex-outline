import styled, { css } from "styled-components";
import { ellipsis } from "../styles";

type Props = {
  /** The type of text to render */
  type?: "secondary" | "tertiary" | "danger";
  /** The size of the text */
  size?: "xlarge" | "large" | "medium" | "small" | "xsmall";
  /** The direction of the text (defaults to ltr) */
  dir?: "ltr" | "rtl" | "auto";
  /** Whether the text should be selectable (defaults to false) */
  selectable?: boolean;
  /** The font weight of the text */
  weight?: "xbold" | "bold" | "normal";
  /** Whether the text should be italic */
  italic?: boolean;
  /** Whether the text should be truncated with an ellipsis */
  ellipsis?: boolean;
  /** Whether the text should be monospaced */
  monospace?: boolean;
};

/**
 * Use this component for all interface text that should not be selectable
 * by the user, this is the majority of UI text explainers, notes, headings.
 */
const Text = styled.span<Props>`
  margin-top: 0;
  text-align: ${(props) => (props.dir ? props.dir : "inherit")};
  color: ${(props) =>
    props.type === "secondary"
      ? props.theme.textSecondary
      : props.type === "tertiary"
        ? props.theme.textTertiary
        : props.type === "danger"
          ? props.theme.exui.feedback.danger
          : props.theme.text};
  font-size: ${(props) =>
    props.size === "xlarge"
      ? "1.625rem"
      : props.size === "large"
        ? "1.125rem"
        : props.size === "medium"
          ? "1rem"
          : props.size === "small"
            ? props.theme.exui.typography.bodyFontSize
            : props.size === "xsmall"
              ? props.theme.exui.typography.smallFontSize
              : "inherit"};

  ${(props) =>
    props.weight &&
    css`
      font-weight: ${props.weight === "xbold"
        ? props.theme.exui.typography.fontWeightBold
        : props.weight === "bold"
          ? props.theme.exui.typography.fontWeightMedium
          : props.weight === "normal"
            ? props.theme.exui.typography.fontWeightRegular
            : "inherit"};
    `}

  font-style: ${(props) => (props.italic ? "italic" : "normal")};
  font-family: ${(props) =>
    props.monospace ? props.theme.fontFamilyMono : "inherit"};

  white-space: normal;
  user-select: ${(props) => (props.selectable ? "text" : "none")};

  ${(props) => props.ellipsis && ellipsis()}
`;

export default Text;
