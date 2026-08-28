import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import type { DefaultTheme } from "styled-components";
import { ThemeProvider } from "styled-components";
import { light } from "@shared/styles/theme";

/**
 * Renders a component wrapped in the Light theme for component tests.
 *
 * @param ui the element to render.
 * @param theme an optional theme override, defaults to the Light theme.
 * @returns the testing-library render result.
 */
export function renderWithTheme(ui: ReactElement, theme: DefaultTheme = light) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

/**
 * Returns the concatenated text of every stylesheet injected by
 * styled-components, which component tests can assert on to prove that visual
 * states are bound to the expected theme tokens.
 *
 * @returns the concatenated CSS text.
 */
export function getInjectedCss(): string {
  const styleSheets = Array.from(
    document.head.querySelectorAll("style[data-styled]")
  );
  return styleSheets.map((style) => style.textContent ?? "").join("\n");
}

/**
 * Converts a hex color to the `rgb()` form that jsdom serializes computed
 * longhand color values as.
 *
 * @param hex the hex color, e.g. "#e8e8e3".
 * @returns the rgb form, e.g. "rgb(232, 232, 227)".
 */
export function toRgb(hex: string): string {
  const value = parseInt(hex.replace("#", ""), 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgb(${r}, ${g}, ${b})`;
}
