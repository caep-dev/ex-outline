import { componentRecipes, exuiTokens } from "@exre/exui-tokens";
import { buildDarkTheme, buildLightTheme, buildPitchBlackTheme } from "./theme";
import {
  buildExuiSemanticTheme,
  deriveInteractionStates,
  isValidHexColor,
  resolveAccent,
} from "./exuiTheme";

describe("#buildExuiSemanticTheme", () => {
  it("selects the light token group for light mode", () => {
    const theme = buildExuiSemanticTheme("light");

    expect(theme.mode).toBe("light");
  });

  it("selects the dark token group for dark mode", () => {
    const theme = buildExuiSemanticTheme("dark");

    expect(theme.mode).toBe("dark");
  });

  it("selects the pitch black token group for pitch black mode", () => {
    const theme = buildExuiSemanticTheme("pitchBlack");

    expect(theme.mode).toBe("pitchBlack");
  });

  it("exposes the standard and compact density scales", () => {
    const theme = buildExuiSemanticTheme("light");

    expect(theme.density.standard.controlHeight).toBeDefined();
    expect(theme.density.compact.controlHeight).toBeDefined();
    expect(theme.density.standard.controlHeight).not.toBe(
      theme.density.compact.controlHeight
    );
  });

  it("keeps typography identical across modes", () => {
    const light = buildExuiSemanticTheme("light");
    const dark = buildExuiSemanticTheme("dark");

    expect(light.typography.fontFamily).toBe(dark.typography.fontFamily);
    expect(light.typography.fontFamilyMono).toBe(
      dark.typography.fontFamilyMono
    );
  });

  it("resolves every initial component recipe for every theme mode", () => {
    for (const mode of ["light", "dark", "pitchBlack"] as const) {
      const components = buildExuiSemanticTheme(mode).components;

      expect(Object.keys(components)).toEqual([
        "button",
        "formControl",
        "sidebarItem",
        "menu",
        "dialog",
        "tabs",
      ]);
      expect(components.button.default.height).toBe(
        componentRecipes.button.default.height
      );
      expect(components.formControl.base.radius).toBe("14px");
      expect(components.sidebarItem.default.radius).toBe("14px");
      expect(components.menu.surface.radius).toBe("22px");
      expect(components.dialog.surface.radius).toBe("26px");
      expect(components.tabs.trigger.radius).toBe("14px");
    }
  });

  it("keeps full radius exclusive to button recipes", () => {
    const components = buildExuiSemanticTheme("light").components;

    expect(components.button.default.radius).toBe(exuiTokens.radii.full);
    expect(components.button.small.radius).toBe(exuiTokens.radii.full);
    expect(components.button.large.radius).toBe(exuiTokens.radii.full);
    expect(components.formControl.base.radius).not.toBe(exuiTokens.radii.full);
    expect(components.sidebarItem.default.radius).not.toBe(
      exuiTokens.radii.full
    );
    expect(components.menu.item.radius).not.toBe(exuiTokens.radii.full);
    expect(components.tabs.trigger.radius).not.toBe(exuiTokens.radii.full);
  });
});

describe("#resolveAccent", () => {
  const tokens = exuiTokens.themes.light;

  it("applies a valid workspace accent", () => {
    const resolved = resolveAccent(tokens, {
      accent: "#ff0000",
      accentText: "#ffffff",
    });

    expect(resolved.primary).toBe("#ff0000");
    expect(resolved.primaryForeground).toBe("#ffffff");
  });

  it("falls back to the token accent when the workspace accent is invalid", () => {
    const resolved = resolveAccent(tokens, {
      accent: "red; } body { display: none",
      accentText: "#ffffff",
    });

    expect(resolved.primary).toBe(tokens.control.primary);
  });

  it("falls back to the token accent text when the workspace accent text is invalid", () => {
    const resolved = resolveAccent(tokens, {
      accent: "#ff0000",
      accentText: "transparent",
    });

    expect(resolved.primary).toBe("#ff0000");
    expect(resolved.primaryForeground).toBe(tokens.control.primaryForeground);
  });

  it("derives the interaction states from the resolved accent", () => {
    const resolved = resolveAccent(tokens, {
      accent: "#ff0000",
      accentText: "#ffffff",
    });

    expect(resolved.primaryHover).toBeDefined();
    expect(resolved.primaryActive).toBeDefined();
    expect(resolved.primaryDisabled).toBeDefined();
    expect(resolved.focusRing).toBeDefined();
    expect(resolved.primaryHover).not.toBe(resolved.primaryActive);
  });

  it("applies workspace branding only to the primary button recipe", () => {
    const theme = buildExuiSemanticTheme("light", {
      accent: "#ff0000",
      accentText: "#ffffff",
    });

    expect(theme.components.button.primary.default.background).toBe("#ff0000");
    expect(theme.components.button.primary.default.foreground).toBe("#ffffff");
    expect(theme.components.button.primary.hover.background).toBe(
      theme.control.primaryHover
    );
    expect(theme.components.button.secondary.disabled.background).toBe(
      exuiTokens.themes.light.control.disabled
    );
    expect(theme.components.button.danger.default.background).toBe(
      exuiTokens.themes.light.control.danger
    );
  });
});

describe("#deriveInteractionStates", () => {
  it("is deterministic for the same input", () => {
    const first = deriveInteractionStates("#0366d6");
    const second = deriveInteractionStates("#0366d6");

    expect(second).toEqual(first);
  });

  it("darkens light colors on interaction", () => {
    const states = deriveInteractionStates("#ffffff");

    expect(states.hover).not.toBe("#ffffff");
    expect(states.active).not.toBe(states.hover);
  });

  it("lightens near-black colors on interaction", () => {
    const states = deriveInteractionStates("#000000");

    expect(states.hover).not.toBe("#000000");
    expect(states.active).not.toBe(states.hover);
  });

  it("returns the input unchanged when it cannot be derived from", () => {
    const states = deriveInteractionStates("not-a-color");

    expect(states.hover).toBe("not-a-color");
    expect(states.active).toBe("not-a-color");
    expect(states.disabled).toBe("not-a-color");
    expect(states.focusRing).toBe("not-a-color");
  });
});

describe("#isValidHexColor", () => {
  it("accepts 3 and 6 digit hex colors", () => {
    expect(isValidHexColor("#fff")).toBe(true);
    expect(isValidHexColor("#ffffff")).toBe(true);
    expect(isValidHexColor("#0366d6")).toBe(true);
  });

  it("rejects non-hex and injected values", () => {
    expect(isValidHexColor("red")).toBe(false);
    expect(isValidHexColor("")).toBe(false);
    expect(isValidHexColor(undefined)).toBe(false);
    expect(isValidHexColor("#fff; } body { display: none")).toBe(false);
    expect(isValidHexColor("rgb(0, 0, 0)")).toBe(false);
  });
});

describe("theme builders", () => {
  it("builds the light theme, also used when printing", () => {
    const theme = buildLightTheme();

    expect(theme.isDark).toBe(false);
    expect(theme.exui.mode).toBe("light");
    expect(theme.fontFamily).not.toBe(theme.exui.typography.fontFamily);
    expect(theme.fontFamily).toContain("BlinkMacSystemFont");
  });

  it("builds the dark theme", () => {
    const theme = buildDarkTheme();

    expect(theme.isDark).toBe(true);
    expect(theme.exui.mode).toBe("dark");
  });

  it("builds the pitch black theme as its own token group", () => {
    const theme = buildPitchBlackTheme();

    expect(theme.isDark).toBe(true);
    expect(theme.exui.mode).toBe("pitchBlack");
  });

  it("keeps the workspace brand override consistent across modes", () => {
    const input = { accent: "#ff0000", accentText: "#ffffff" };
    const light = buildLightTheme(input);
    const dark = buildDarkTheme(input);

    expect(light.exui.control.primary).toBe("#ff0000");
    expect(dark.exui.control.primary).toBe("#ff0000");
    expect(light.exui.control.primaryHover).toBe(
      dark.exui.control.primaryHover
    );
  });

  it("falls back to the token brand when the workspace brand is invalid", () => {
    const light = buildLightTheme({ accent: "not-a-color" });

    expect(light.exui.control.primary).toBe(
      buildExuiSemanticTheme("light").control.primary
    );
  });
});
