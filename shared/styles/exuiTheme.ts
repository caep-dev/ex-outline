import { darken, getLuminance, lighten, transparentize } from "polished";
import type { DefaultTheme } from "styled-components";
import { exuiTokens } from "@exre/exui-tokens";
import type { ThemeTokens } from "@exre/exui-tokens";
import type { CustomTheme } from "../types";

/**
 * The ExUI theme groups that Outline can resolve to. `pitchBlack` is a
 * first-class token group rather than a runtime mutation of `dark`.
 */
export type ExuiThemeMode = "light" | "dark" | "pitchBlack";

/**
 * The only brand color format accepted from the workspace `CustomTheme`.
 *
 * The server validates the same values, but the adapter re-validates so that
 * legacy stored data, test fixtures and public share payloads cannot inject
 * arbitrary CSS through a theme value.
 */
export const HEX_COLOR_PATTERN = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/**
 * Relative luminance below which interaction states are lightened instead of
 * darkened, so near-black brand colors stay interactive.
 */
const DARK_LUMINANCE_THRESHOLD = 0.2;

/** The Outline legacy theme fields, before ExUI tokens are applied. */
export type ExuiLegacyTheme = Omit<DefaultTheme, "exui">;

export interface ExuiSurfaceTheme {
  /** The application canvas behind every other surface. */
  readonly background: string;
  /** A raised surface such as a card. */
  readonly surface: string;
  /** A recessed surface such as a hovered row. */
  readonly surfaceSecondary: string;
  /** A further recessed surface, one step below `surfaceSecondary`. */
  readonly surfaceTertiary: string;
  /** A surface raised above the page, such as a popover. */
  readonly elevated: string;
  /** The scrim behind modal surfaces. */
  readonly overlay: string;
  /** A low-emphasis surface used for muted controls. */
  readonly muted: string;
  readonly border: string;
  readonly borderStrong: string;
  readonly borderInput: string;
  readonly borderFocused: string;
  readonly divider: string;
  readonly foreground: string;
  readonly foregroundSecondary: string;
  readonly foregroundTertiary: string;
  readonly placeholder: string;
  /** Text color that reads against `foreground` rather than `background`. */
  readonly inverse: string;
  readonly link: string;
}

export interface ExuiInteractionStates {
  readonly hover: string;
  readonly active: string;
  readonly disabled: string;
  readonly focusRing: string;
}

export interface ExuiAccentTheme {
  readonly primary: string;
  readonly primaryForeground: string;
  readonly primaryHover: string;
  readonly primaryActive: string;
  readonly primaryDisabled: string;
  readonly focusRing: string;
}

export interface ExuiControlTheme extends ExuiAccentTheme {
  readonly neutral: string;
  readonly neutralForeground: string;
  readonly neutralHover: string;
  readonly danger: string;
  readonly dangerForeground: string;
  readonly dangerHover: string;
  readonly dangerActive: string;
  readonly invalid: string;
  readonly selected: string;
  readonly disabled: string;
}

export interface ExuiFeedbackTheme {
  readonly danger: string;
  readonly dangerForeground: string;
  readonly warning: string;
  readonly warningForeground: string;
  readonly success: string;
  readonly successForeground: string;
  readonly info: string;
  readonly infoForeground: string;
}

export interface ExuiTypographyTheme {
  readonly fontFamily: string;
  readonly fontFamilyMono: string;
  readonly fontFamilyEmoji: string;
  readonly fontWeightRegular: number;
  readonly fontWeightMedium: number;
  readonly fontWeightBold: number;
  readonly bodyFontSize: string;
  readonly bodyLineHeight: string;
  readonly smallFontSize: string;
  readonly smallLineHeight: string;
}

export interface ExuiDensityTheme {
  readonly controlHeight: string;
  readonly controlPaddingInline: string;
  readonly controlGap: string;
  readonly iconSize: string;
  readonly controlRadius: string;
}

export interface ExuiDensityScale {
  /** Density for forms, dialogs, toasts and primary actions. */
  readonly standard: ExuiDensityTheme;
  /** Density for sidebars, menus, toolbars and dense lists. */
  readonly compact: ExuiDensityTheme;
}

export interface ExuiMenuTheme {
  readonly background: string;
  readonly foreground: string;
  readonly foregroundDisabled: string;
  readonly radius: string;
  readonly shadow: string;
  readonly itemBackgroundHover: string;
  readonly itemForegroundHover: string;
  readonly itemBackgroundDanger: string;
  readonly itemForegroundDanger: string;
  readonly itemBackgroundSelected: string;
  readonly itemForegroundSelected: string;
  readonly separator: string;
}

export interface ExuiDialogTheme {
  readonly background: string;
  readonly foreground: string;
  readonly foregroundMuted: string;
  readonly overlay: string;
  readonly radius: string;
  readonly shadow: string;
}

export interface ExuiTooltipTheme {
  readonly background: string;
  readonly foreground: string;
  /** A low-emphasis border derived from the tooltip foreground. */
  readonly border: string;
  readonly radius: string;
  readonly shadow: string;
}

export interface ExuiToastTheme {
  readonly background: string;
  readonly foreground: string;
  readonly border: string;
  readonly radius: string;
  readonly shadow: string;
}

export interface ExuiTabTheme {
  readonly foreground: string;
  readonly foregroundHover: string;
  readonly foregroundActive: string;
  readonly indicator: string;
}

export interface ExuiOverlayTheme {
  readonly menu: ExuiMenuTheme;
  readonly dialog: ExuiDialogTheme;
  readonly tooltip: ExuiTooltipTheme;
  readonly toast: ExuiToastTheme;
  readonly tab: ExuiTabTheme;
}

export interface ExuiRadiiTheme {
  readonly none: string;
  readonly small: string;
  readonly medium: string;
  readonly large: string;
  readonly extraLarge: string;
  readonly full: string;
}

export interface ExuiShadowTheme {
  readonly small: string;
  readonly medium: string;
  readonly large: string;
  readonly focus: string;
}

/**
 * The namespaced ExUI semantics exposed on `DefaultTheme`. Migrated components
 * read these instead of deriving their own colors, and legacy fields remain
 * available for components that are not migrated yet.
 */
export interface ExuiSemanticTheme {
  readonly mode: ExuiThemeMode;
  readonly surface: ExuiSurfaceTheme;
  readonly control: ExuiControlTheme;
  readonly feedback: ExuiFeedbackTheme;
  readonly typography: ExuiTypographyTheme;
  readonly density: ExuiDensityScale;
  readonly overlay: ExuiOverlayTheme;
  readonly radii: ExuiRadiiTheme;
  readonly shadow: ExuiShadowTheme;
}

/**
 * Checks whether a value is a hex color the adapter may apply as a brand
 * override.
 *
 * @param value the candidate value.
 * @returns true when the value is a 3 or 6 digit hex color.
 */
export function isValidHexColor(value: unknown): value is string {
  return typeof value === "string" && HEX_COLOR_PATTERN.test(value);
}

/**
 * Derives the hover, active, disabled and focus-ring states of a base color in
 * one place, so that the same brand color never resolves to different states in
 * different components.
 *
 * @param base the base color to derive states from.
 * @returns the derived interaction states, or the base color itself when the
 * input cannot be derived from.
 */
export function deriveInteractionStates(base: string): ExuiInteractionStates {
  if (!isValidHexColor(base)) {
    return {
      hover: base,
      active: base,
      disabled: base,
      focusRing: base,
    };
  }

  const lightenOnDark = getLuminance(base) < DARK_LUMINANCE_THRESHOLD;

  return {
    hover: lightenOnDark ? lighten(0.08, base) : darken(0.06, base),
    active: lightenOnDark ? lighten(0.14, base) : darken(0.12, base),
    disabled: transparentize(0.5, base),
    focusRing: lightenOnDark ? lighten(0.12, base) : darken(0.05, base),
  };
}

/**
 * Resolves the effective brand color of a theme, applying any valid workspace
 * `accent` and `accentText` overrides and deriving the interaction states from
 * the result. Invalid overrides are ignored and fall back to the selected ExUI
 * theme.
 *
 * @param tokens the selected ExUI theme tokens.
 * @param customTheme the optional workspace brand override.
 * @returns the resolved brand color and its interaction states.
 */
export function resolveAccent(
  tokens: ThemeTokens,
  customTheme?: Partial<CustomTheme>
): ExuiAccentTheme {
  const requestedAccent = customTheme?.accent;
  const requestedAccentText = customTheme?.accentText;

  if (
    !isValidHexColor(requestedAccent) &&
    !isValidHexColor(requestedAccentText)
  ) {
    return {
      primary: tokens.control.primary,
      primaryForeground: tokens.control.primaryForeground,
      primaryHover: tokens.control.hover,
      primaryActive: tokens.control.active,
      primaryDisabled: tokens.control.disabled,
      focusRing: tokens.control.focusRing,
    };
  }

  const primary = isValidHexColor(requestedAccent)
    ? requestedAccent
    : tokens.control.primary;
  const primaryForeground = isValidHexColor(requestedAccentText)
    ? requestedAccentText
    : tokens.control.primaryForeground;
  const interactionStates = deriveInteractionStates(primary);

  return {
    primary,
    primaryForeground,
    primaryHover: interactionStates.hover,
    primaryActive: interactionStates.active,
    primaryDisabled: interactionStates.disabled,
    focusRing: interactionStates.focusRing,
  };
}

/**
 * Builds the namespaced ExUI semantics for a theme mode.
 *
 * @param mode the ExUI theme group to select.
 * @param customTheme the optional workspace brand override.
 * @returns the namespaced semantic theme.
 */
export function buildExuiSemanticTheme(
  mode: ExuiThemeMode,
  customTheme?: Partial<CustomTheme>
): ExuiSemanticTheme {
  const tokens = exuiTokens.themes[mode];
  const accent = resolveAccent(tokens, customTheme);
  const dangerStates = deriveInteractionStates(tokens.control.danger);
  const { typography, radii, shadows, density } = exuiTokens;

  return {
    mode,
    surface: {
      background: tokens.surface.background,
      surface: tokens.surface.card,
      surfaceSecondary: tokens.surface.secondary,
      surfaceTertiary: tokens.surface.tertiary,
      elevated: tokens.surface.popover,
      overlay: tokens.surface.overlay,
      muted: tokens.surface.secondary,
      border: tokens.border.default,
      borderStrong: tokens.border.strong,
      borderInput: tokens.border.input,
      borderFocused: tokens.border.focused,
      divider: tokens.border.divider,
      foreground: tokens.text.primary,
      foregroundSecondary: tokens.text.secondary,
      foregroundTertiary: tokens.text.tertiary,
      placeholder: tokens.text.placeholder,
      inverse: tokens.text.inverse,
      link: tokens.text.link,
    },
    control: {
      ...accent,
      neutral: tokens.control.neutral,
      neutralForeground: tokens.control.neutralForeground,
      neutralHover: tokens.surface.secondary,
      danger: tokens.control.danger,
      dangerForeground: tokens.control.dangerForeground,
      dangerHover: dangerStates.hover,
      dangerActive: dangerStates.active,
      invalid: tokens.control.invalid,
      selected: tokens.control.selected,
      disabled: tokens.control.disabled,
    },
    feedback: {
      danger: tokens.feedback.danger,
      dangerForeground: tokens.feedback.dangerForeground,
      warning: tokens.feedback.warning,
      warningForeground: tokens.feedback.warningForeground,
      success: tokens.feedback.success,
      successForeground: tokens.feedback.successForeground,
      info: tokens.feedback.info,
      infoForeground: tokens.feedback.infoForeground,
    },
    typography: {
      fontFamily: typography.fontFamily,
      fontFamilyMono: typography.fontFamilyMono,
      fontFamilyEmoji: typography.fontFamilyEmoji,
      fontWeightRegular: typography.fontWeightRegular,
      fontWeightMedium: typography.fontWeightMedium,
      fontWeightBold: typography.fontWeightBold,
      bodyFontSize: typography.bodyFontSize,
      bodyLineHeight: typography.bodyLineHeight,
      smallFontSize: typography.smallFontSize,
      smallLineHeight: typography.smallLineHeight,
    },
    density: {
      standard: {
        controlHeight: density.standard.controlHeight,
        controlPaddingInline: density.standard.controlPaddingInline,
        controlGap: density.standard.controlGap,
        iconSize: density.standard.iconSize,
        controlRadius: density.standard.controlRadius,
      },
      compact: {
        controlHeight: density.compact.controlHeight,
        controlPaddingInline: density.compact.controlPaddingInline,
        controlGap: density.compact.controlGap,
        iconSize: density.compact.iconSize,
        controlRadius: density.compact.controlRadius,
      },
    },
    overlay: {
      menu: {
        background: tokens.surface.menu,
        foreground: tokens.text.secondary,
        foregroundDisabled: tokens.text.tertiary,
        radius: radii.medium,
        shadow: tokens.shadow.menu,
        itemBackgroundHover: tokens.control.primary,
        itemForegroundHover: tokens.control.primaryForeground,
        itemBackgroundDanger: tokens.control.danger,
        itemForegroundDanger: tokens.control.dangerForeground,
        itemBackgroundSelected: tokens.control.selected,
        itemForegroundSelected: tokens.control.primaryForeground,
        separator: tokens.border.divider,
      },
      dialog: {
        background: tokens.surface.modal,
        foreground: tokens.text.primary,
        foregroundMuted: tokens.text.secondary,
        overlay: tokens.surface.overlay,
        radius: radii.large,
        shadow: tokens.shadow.modal,
      },
      tooltip: {
        background: tokens.text.primary,
        foreground: tokens.surface.background,
        border: transparentize(0.75, tokens.surface.background),
        radius: radii.small,
        shadow: shadows.medium,
      },
      toast: {
        background: tokens.surface.popover,
        foreground: tokens.surface.popoverForeground,
        border: tokens.border.default,
        radius: radii.large,
        shadow: shadows.large,
      },
      tab: {
        foreground: tokens.text.tertiary,
        foregroundHover: tokens.text.secondary,
        foregroundActive: tokens.text.primary,
        indicator: tokens.text.primary,
      },
    },
    radii: {
      none: radii.none,
      small: radii.small,
      medium: radii.medium,
      large: radii.large,
      extraLarge: radii.extraLarge,
      full: radii.full,
    },
    shadow: {
      small: shadows.small,
      medium: shadows.medium,
      large: shadows.large,
      focus: shadows.focus,
    },
  };
}

/**
 * Maps the ExUI tokens of a theme mode onto the Outline legacy theme fields
 * that the token contract now owns.
 *
 * Fields without a token equivalent, such as the sidebar ramp, notice colors
 * and the brand palette, keep the value produced by the legacy builder so that
 * surfaces outside the first migration stage are unchanged.
 *
 * @param mode the ExUI theme group to select.
 * @param customTheme the optional workspace brand override.
 * @returns the legacy theme fields owned by the token contract.
 */
export function buildExuiLegacyOverrides(
  mode: ExuiThemeMode,
  customTheme?: Partial<CustomTheme>
): Partial<DefaultTheme> {
  const tokens = exuiTokens.themes[mode];
  const accent = resolveAccent(tokens, customTheme);
  const syntax = tokens.editor.syntax;
  const { typography } = exuiTokens;

  return {
    fontFamily: typography.fontFamily,
    fontFamilyMono: typography.fontFamilyMono,
    fontFamilyEmoji: typography.fontFamilyEmoji,
    fontWeightRegular: typography.fontWeightRegular,
    fontWeightMedium: typography.fontWeightMedium,
    fontWeightBold: typography.fontWeightBold,

    background: tokens.surface.background,
    backgroundSecondary: tokens.surface.secondary,
    backgroundTertiary: tokens.surface.tertiary,
    backgroundQuaternary: tokens.surface.accent,

    text: tokens.text.primary,
    textSecondary: tokens.text.secondary,
    textTertiary: tokens.text.tertiary,
    cursor: tokens.text.primary,
    placeholder: tokens.text.placeholder,
    link: tokens.text.link,

    accent: accent.primary,
    accentText: accent.primaryForeground,
    selected: tokens.control.selected,
    danger: tokens.feedback.danger,
    warning: tokens.feedback.warning,
    success: tokens.feedback.success,
    info: tokens.feedback.info,

    divider: tokens.border.divider,
    titleBarDivider: tokens.border.divider,
    inputBorder: tokens.border.input,
    inputBorderFocused: tokens.border.focused,
    inputBackground: tokens.surface.input,

    backdrop: tokens.surface.overlay,
    modalBackdrop: tokens.surface.overlay,
    modalBackground: tokens.surface.modal,
    modalShadow: tokens.shadow.modal,
    menuBackground: tokens.surface.menu,
    menuShadow: tokens.shadow.menu,
    menuItemSelected: tokens.surface.secondary,
    listItemHoverBackground: tokens.surface.secondary,
    mentionBackground: tokens.surface.secondary,
    mentionHoverBackground: tokens.surface.tertiary,
    tooltipBackground: tokens.text.primary,
    tooltipText: tokens.surface.background,
    toastBackground: tokens.surface.popover,
    toastText: tokens.surface.popoverForeground,

    buttonNeutralBackground: tokens.control.neutral,
    buttonNeutralHoverBackground: tokens.surface.secondary,
    buttonNeutralText: tokens.control.neutralForeground,
    buttonNeutralBorder: tokens.border.default,

    quote: tokens.editor.quote,
    code: tokens.editor.code,
    codeBackground: tokens.editor.codeBackground,
    codeBorder: tokens.editor.codeBorder,
    embedBorder: tokens.editor.embedBorder,
    horizontalRule: tokens.border.divider,
    tableSelected: tokens.control.primary,
    tableSelectedBackground: tokens.editor.tableSelection,
    textHighlight: tokens.editor.highlight,
    textHighlightForeground: tokens.editor.highlightForeground,
    scrollbarBackground: tokens.editor.scrollbarBackground,
    scrollbarThumb: tokens.editor.scrollbarThumb,

    codeComment: syntax.comment,
    codePunctuation: syntax.punctuation,
    codeNumber: syntax.number,
    codeProperty: syntax.property,
    codeTag: syntax.tag,
    codeString: syntax.string,
    codeClassName: syntax.className,
    codeConstant: syntax.constant,
    codeParameter: syntax.parameter,
    codeSelector: syntax.selector,
    codeAttrName: syntax.attributeName,
    codeAttrValue: syntax.attributeValue,
    codeEntity: syntax.entity,
    codeKeyword: syntax.keyword,
    codeFunction: syntax.function,
    codeStatement: syntax.statement,
    codePlaceholder: syntax.placeholder,
    codeInserted: syntax.inserted,
    codeImportant: syntax.important,
    codeOperator: syntax.operator,
  };
}

/**
 * Builds a complete Outline theme by applying the ExUI tokens of a mode on top
 * of the legacy theme fields. This is the single mapping point from the versioned
 * ExUI token contract to `DefaultTheme`.
 *
 * @param mode the ExUI theme group to select.
 * @param legacy the legacy theme fields produced by `shared/styles/theme`.
 * @param customTheme the optional workspace brand override.
 * @returns a complete theme carrying both legacy and ExUI semantic fields.
 */
export function buildExuiTheme(
  mode: ExuiThemeMode,
  legacy: ExuiLegacyTheme,
  customTheme?: Partial<CustomTheme>
): DefaultTheme {
  return {
    ...legacy,
    ...buildExuiLegacyOverrides(mode, customTheme),
    exui: buildExuiSemanticTheme(mode, customTheme),
  };
}
