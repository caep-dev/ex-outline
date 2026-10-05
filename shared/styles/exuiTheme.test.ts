import { componentRecipes, exuiTokens } from "@exre/exui/tokens";
import { buildDarkTheme, buildLightTheme, buildPitchBlackTheme } from "./theme";
import {
  buildExuiSemanticTheme,
  deriveInteractionStates,
  isValidHexColor,
  resolveAccent,
} from "./exuiTheme";

describe("#buildExuiSemanticTheme", () => {
  it("applies consumer tokens before resolving legacy, semantic, and recipe fields", () => {
    const base = exuiTokens.themes.dark;
    const effective = {
      ...base,
      control: {
        ...base.control,
        primary: "#fafafa",
        primaryForeground: "#0a0a0a",
        hover: "#e5e5e5",
        active: "#d4d4d4",
      },
      text: { ...base.text, link: "#fafafa", placeholder: "#a3a3a3" },
      border: { ...base.border, focused: "#a3a3a3" },
      focusShadow: "0 0 0 3px rgb(250 250 250 / 30%)",
    };
    const theme = buildDarkTheme({}, effective);
    expect(theme.accent).toBe(effective.control.primary);
    expect(theme.link).toBe(effective.text.link);
    expect(theme.placeholder).toBe(effective.text.placeholder);
    expect(theme.exui.control.primaryHover).toBe(effective.control.hover);
    expect(theme.exui.components.button.primary.active.background).toBe(
      effective.control.active
    );
    expect(theme.exui.components.formControl.focus.shadow).toBe(
      effective.focusShadow
    );
    expect(theme.exui.shadow.focus).toBe(effective.focusShadow);
    expect(theme.inputBorderFocused).toBe(effective.border.focused);
    expect(base.control.primary).not.toBe(effective.control.primary);
  });
  it("maps legacy sidebar and editor notice surfaces in every mode", () => {
    for (const [theme, tokens] of [
      [buildLightTheme(), exuiTokens.themes.light],
      [buildDarkTheme(), exuiTokens.themes.dark],
      [buildPitchBlackTheme(), exuiTokens.themes.pitchBlack],
    ] as const) {
      expect(theme.exui.tokens).toBe(tokens);
      expect(theme.exui.surface.muted).toBe(tokens.surface.tertiary);
      expect(theme.exui.control.neutralHover).toBe(
        theme.exui.components.button.secondary.hover.background
      );
      expect(theme.exui.control.dangerHover).toBe(
        theme.exui.components.button.danger.hover.background
      );
      expect(theme.exui.control.dangerActive).toBe(
        theme.exui.components.button.danger.active.background
      );
      expect(theme.exui.shadow.invalid).toBe(exuiTokens.shadows.invalid);
      expect(theme.sidebarBackground).toBe(tokens.sidebar.background);
      expect(theme.sidebarText).toBe(tokens.sidebar.foreground);
      expect(theme.sidebarHoverBackground).toBe(tokens.sidebar.accent);
      expect(theme.sidebarDraftBorder).toBe(tokens.sidebar.border);
      expect(theme.noticeWarningBackground).toBe(tokens.feedback.danger);
      expect(theme.noticeInfoBackground).toBe(tokens.feedback.info);
      expect(theme.noticeSuccessBackground).toBe(tokens.feedback.success);
      expect(theme.noticeTipBackground).toBe(tokens.feedback.warning);
      expect(theme.noticeInfoText).toBe(tokens.text.primary);
      expect(theme.progressBarBackground).toBe(tokens.surface.tertiary);
    }
  });

  it("keeps overlay aliases aligned with their ExUI recipes", () => {
    for (const mode of ["light", "dark", "pitchBlack"] as const) {
      const { overlay, components } = buildExuiSemanticTheme(mode);

      expect(overlay.menu.background).toBe(components.menu.surface.background);
      expect(overlay.menu.foreground).toBe(components.menu.surface.foreground);
      expect(overlay.menu.radius).toBe(components.menu.surface.radius);
      expect(overlay.menu.itemBackgroundHover).toBe(
        components.menu.item.hover.background
      );
      expect(overlay.menu.itemForegroundHover).toBe(
        components.menu.item.hover.foreground
      );
      expect(overlay.menu.itemForegroundDanger).toBe(
        components.menu.item.destructive.foreground
      );
      expect(overlay.dialog.radius).toBe(components.dialog.surface.radius);
      expect(overlay.tooltip.radius).toBe(exuiTokens.radii.extraLarge);
      expect(overlay.tooltip.border).toBe("transparent");
      expect(overlay.tooltip.shadow).toBe("none");
      expect(overlay.tab.foreground).toBe(
        components.tabs.trigger.default.foreground
      );
      expect(overlay.tab.foregroundHover).toBe(
        components.tabs.trigger.hover.foreground
      );
      expect(overlay.tab.foregroundActive).toBe(
        components.tabs.trigger.selected.foreground
      );
    }
  });

  it("preserves ExUI interaction colors when only the brand foreground changes", () => {
    const tokens = exuiTokens.themes.light;
    const theme = buildLightTheme({ accentText: "#000000" });

    expect(theme.exui.control.primaryForeground).toBe("#000000");
    expect(theme.exui.control.primaryHover).toBe(tokens.control.hover);
    expect(theme.exui.control.primaryActive).toBe(tokens.control.active);
    expect(theme.exui.control.primaryDisabled).toBe(tokens.control.disabled);
    expect(theme.exui.control.focusRing).toBe(tokens.control.focusRing);
  });

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

  it("keeps the primary button focus border from the ExUI recipe", () => {
    for (const mode of ["light", "dark", "pitchBlack"] as const) {
      expect(
        buildExuiSemanticTheme(mode).components.button.primary.focus.border
      ).toBe(componentRecipes.button.primary.focus.border);
    }
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
      expect(components.formControl.base.radius).toBe(
        exuiTokens.radii.extraLarge
      );
      expect(components.sidebarItem.default.radius).toBe(
        exuiTokens.radii.extraLarge
      );
      expect(components.menu.surface.radius).toBe("1.375rem");
      expect(components.dialog.surface.radius).toBe("1.625rem");
      expect(components.tabs.trigger.radius).toBe(exuiTokens.radii.extraLarge);
      expect(components.button.action.radius).toBe("0.75rem");
      expect(components.tabs.primary.selected.background).toBe(
        exuiTokens.themes[mode].control.primary
      );
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
    expect(theme.fontFamily).toBe(theme.exui.typography.fontFamily);
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
