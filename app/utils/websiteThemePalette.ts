import { exuiTokens } from "@exre/exui/tokens";
import type { ExuiEffectiveTokens } from "@shared/styles/exuiTheme";

export interface WebsiteThemePalette {
  light: ExuiEffectiveTokens;
  dark: ExuiEffectiveTokens;
}

/** Reads the shared CSS itself, never a mirror of the currently rendered theme. */
export function readWebsiteThemePalette(): WebsiteThemePalette | undefined {
  const read = (mode: "light" | "dark"): ExuiEffectiveTokens | undefined => {
    const probe = document.createElement("span");
    probe.className = `website-theme-profile ${mode}`;
    probe.setAttribute("aria-hidden", "true");
    probe.style.cssText =
      "position:absolute;visibility:hidden;pointer-events:none";
    document.body.appendChild(probe);
    try {
      const css = getComputedStyle(probe);
      const value = (name: string) => {
        const result = css.getPropertyValue(`--exui-${name}`).trim();
        if (!result || result.includes("var(")) {
          throw new Error(`Missing Website theme variable: ${name}`);
        }
        return result;
      };
      const base = exuiTokens.themes[mode];
      return {
        ...base,
        control: {
          ...base.control,
          primary: value("control-primary"),
          primaryForeground: value("control-primary-foreground"),
          hover: value("control-hover"),
          active: value("control-active"),
          selected: value("control-selected"),
          focusRing: value("control-focus-ring"),
          linkHover: value("control-link-hover"),
          linkActive: value("control-link-active"),
        },
        text: {
          ...base.text,
          link: value("text-link"),
          placeholder: value("text-placeholder"),
          tertiary: value("text-tertiary"),
        },
        border: { ...base.border, focused: value("border-focused") },
        sidebar: {
          ...base.sidebar,
          primary: value("sidebar-primary"),
          primaryForeground: value("sidebar-primary-foreground"),
          ring: value("sidebar-ring"),
        },
        focusShadow: value("shadow-focus"),
      };
    } catch {
      // Standard ExUI remains renderable, but missing wiring fails acceptance.
      return undefined;
    } finally {
      probe.remove();
    }
  };
  const light = read("light");
  const dark = read("dark");
  return light && dark ? { light, dark } : undefined;
}
