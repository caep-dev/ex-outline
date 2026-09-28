import { css } from "styled-components";

/**
 * Applies ExUI glass to an existing Outline surface. Set
 * `--outline-glass-elevation` to retain an outer drop shadow.
 */
export const glassSurface = css`
  background: ${(props) => props.theme.exui.glass.fallbackBackground};
  box-shadow:
    var(--outline-glass-elevation, 0 0 transparent),
    ${(props) => props.theme.exui.glass.shadow};

  @supports (backdrop-filter: blur(4px)) or (-webkit-backdrop-filter: blur(4px)) {
    background: ${(props) => props.theme.exui.glass.background};
    backdrop-filter: blur(${(props) => props.theme.exui.glass.blur})
      saturate(${(props) => props.theme.exui.glass.saturation});
    -webkit-backdrop-filter: blur(${(props) => props.theme.exui.glass.blur})
      saturate(${(props) => props.theme.exui.glass.saturation});
  }
`;
