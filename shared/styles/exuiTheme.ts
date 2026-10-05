import { darken, getLuminance, lighten, transparentize } from "polished";
import type { DefaultTheme } from "styled-components";
import { componentRecipes, exuiTokens } from "@exre/exui/tokens";
import type {
  ButtonRecipe,
  ButtonSizeRecipe,
  ButtonVariantRecipe,
  ColorSemanticTokenReference,
  DialogRecipe,
  FoundationReference,
  FormControlRecipe,
  InteractiveStateRecipe,
  MenuItemRecipe,
  MenuRecipe,
  MenuSubmenuTriggerRecipe,
  RecipeColor,
  RecipeFontSize,
  RecipeFontWeight,
  RecipeLineHeight,
  RecipeRadius,
  RecipeShadow,
  SemanticReference,
  ShadowFoundationReference,
  ShadowSemanticTokenReference,
  SidebarItemGeometryRecipe,
  SidebarItemRecipe,
  TabsRecipe,
  ThemeTokens,
} from "@exre/exui/tokens";
import type { CustomTheme } from "../types";

/**
 * The ExUI theme groups that Outline can resolve to. `pitchBlack` is a
 * first-class token group rather than a runtime mutation of `dark`.
 */
export interface ExuiEffectiveTokens extends ThemeTokens {
  /** Optional consumer foundation override, applied before recipe resolution. */
  readonly focusShadow?: string;
}

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
  /** ExUI's tooltip surface has no border. */
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
  readonly invalid: string;
}

type FontWeightFoundationPath =
  | "typography.fontWeightRegular"
  | "typography.fontWeightMedium"
  | "typography.fontWeightBold";

type ResolvedRecipeValue<TValue> = TValue extends {
  readonly kind: "foundation";
  readonly path: infer TPath;
}
  ? TPath extends FontWeightFoundationPath
    ? number
    : string
  : TValue extends { readonly kind: "semantic" }
    ? string
    : TValue extends object
      ? { readonly [TKey in keyof TValue]: ResolvedRecipeValue<TValue[TKey]> }
      : TValue;

type ResolvedRecipe<TRecipe> = {
  readonly [TKey in keyof TRecipe]: ResolvedRecipeValue<TRecipe[TKey]>;
};

/** Resolved component recipes exposed to Outline styled-components. */
export interface ExuiComponentTheme {
  readonly button: ResolvedRecipe<ButtonRecipe>;
  readonly formControl: ResolvedRecipe<FormControlRecipe>;
  readonly sidebarItem: ResolvedRecipe<SidebarItemRecipe>;
  readonly menu: ResolvedRecipe<MenuRecipe>;
  readonly dialog: ResolvedRecipe<DialogRecipe>;
  readonly tabs: ResolvedRecipe<TabsRecipe>;
}

/**
 * The namespaced ExUI semantics exposed on `DefaultTheme`. Migrated components
 * read these instead of deriving their own colors, and legacy fields remain
 * available for components that are not migrated yet.
 */
export interface ExuiSemanticTheme {
  readonly mode: ExuiThemeMode;
  /** The complete ExUI theme group before Outline's workspace accent override. */
  readonly tokens: ExuiEffectiveTokens;
  readonly glass: ThemeTokens["glass"];
  readonly surface: ExuiSurfaceTheme;
  readonly control: ExuiControlTheme;
  readonly feedback: ExuiFeedbackTheme;
  readonly typography: ExuiTypographyTheme;
  readonly density: ExuiDensityScale;
  readonly overlay: ExuiOverlayTheme;
  readonly radii: ExuiRadiiTheme;
  readonly shadow: ExuiShadowTheme;
  readonly components: ExuiComponentTheme;
}

function unreachable(_value: never): never {
  throw new Error("Unsupported ExUI recipe reference");
}

function resolveRadius(value: RecipeRadius): string {
  if (typeof value === "string") {
    return value;
  }

  switch (value.path) {
    case "radii.none":
      return exuiTokens.radii.none;
    case "radii.small":
      return exuiTokens.radii.small;
    case "radii.medium":
      return exuiTokens.radii.medium;
    case "radii.large":
      return exuiTokens.radii.large;
    case "radii.extraLarge":
      return exuiTokens.radii.extraLarge;
    case "radii.full":
      return exuiTokens.radii.full;
    default:
      return unreachable(value.path);
  }
}

function resolveFontSize(value: RecipeFontSize): string {
  if (typeof value === "string") {
    return value;
  }

  switch (value.path) {
    case "typography.bodyFontSize":
      return exuiTokens.typography.bodyFontSize;
    case "typography.smallFontSize":
      return exuiTokens.typography.smallFontSize;
    default:
      return unreachable(value.path);
  }
}

function resolveLineHeight(value: RecipeLineHeight): string {
  if (typeof value === "string") {
    return value;
  }

  switch (value.path) {
    case "typography.bodyLineHeight":
      return exuiTokens.typography.bodyLineHeight;
    case "typography.smallLineHeight":
      return exuiTokens.typography.smallLineHeight;
    default:
      return unreachable(value.path);
  }
}

function resolveFontWeight(value: RecipeFontWeight): number {
  if (typeof value === "number") {
    return value;
  }

  switch (value.path) {
    case "typography.fontWeightRegular":
      return exuiTokens.typography.fontWeightRegular;
    case "typography.fontWeightMedium":
      return exuiTokens.typography.fontWeightMedium;
    case "typography.fontWeightBold":
      return exuiTokens.typography.fontWeightBold;
    default:
      return unreachable(value.path);
  }
}

function resolveSemanticColor(
  reference: SemanticReference<ColorSemanticTokenReference>,
  tokens: ExuiEffectiveTokens
): string {
  switch (reference.path) {
    case "surface.background":
      return tokens.surface.background;
    case "surface.secondary":
      return tokens.surface.secondary;
    case "surface.tertiary":
      return tokens.surface.tertiary;
    case "surface.accent":
      return tokens.surface.accent;
    case "surface.accentForeground":
      return tokens.surface.accentForeground;
    case "surface.popover":
      return tokens.surface.popover;
    case "surface.popoverForeground":
      return tokens.surface.popoverForeground;
    case "surface.modal":
      return tokens.surface.modal;
    case "surface.menu":
      return tokens.surface.menu;
    case "surface.sidebar":
      return tokens.surface.sidebar;
    case "surface.input":
      return tokens.surface.input;
    case "surface.overlay":
      return tokens.surface.overlay;
    case "text.primary":
      return tokens.text.primary;
    case "text.secondary":
      return tokens.text.secondary;
    case "text.placeholder":
      return tokens.text.placeholder;
    case "text.link":
      return tokens.text.link;
    case "text.inverse":
      return tokens.text.inverse;
    case "control.primary":
      return tokens.control.primary;
    case "control.primaryForeground":
      return tokens.control.primaryForeground;
    case "control.hover":
      return tokens.control.hover;
    case "control.active":
      return tokens.control.active;
    case "control.linkHover":
      return tokens.control.linkHover;
    case "control.linkActive":
      return tokens.control.linkActive;
    case "control.disabled":
      return tokens.control.disabled;
    case "control.neutral":
      return tokens.control.neutral;
    case "control.neutralForeground":
      return tokens.control.neutralForeground;
    case "control.danger":
      return tokens.control.danger;
    case "control.dangerForeground":
      return tokens.control.dangerForeground;
    case "control.invalid":
      return tokens.control.invalid;
    case "control.selected":
      return tokens.control.selected;
    case "control.focusRing":
      return tokens.control.focusRing;
    case "border.default":
      return tokens.border.default;
    case "border.strong":
      return tokens.border.strong;
    case "border.input":
      return tokens.border.input;
    case "border.focused":
      return tokens.border.focused;
    case "border.divider":
      return tokens.border.divider;
    case "feedback.danger":
      return tokens.feedback.danger;
    case "feedback.dangerForeground":
      return tokens.feedback.dangerForeground;
    case "sidebar.background":
      return tokens.sidebar.background;
    case "sidebar.foreground":
      return tokens.sidebar.foreground;
    case "sidebar.primary":
      return tokens.sidebar.primary;
    case "sidebar.primaryForeground":
      return tokens.sidebar.primaryForeground;
    case "sidebar.accent":
      return tokens.sidebar.accent;
    case "sidebar.accentForeground":
      return tokens.sidebar.accentForeground;
    case "sidebar.border":
      return tokens.sidebar.border;
    case "sidebar.ring":
      return tokens.sidebar.ring;
    default:
      return unreachable(reference.path);
  }
}

function resolveColor(value: RecipeColor, tokens: ExuiEffectiveTokens): string {
  if (typeof value === "string") {
    return value;
  }
  return resolveSemanticColor(value, tokens);
}

function resolveShadow(
  value: RecipeShadow,
  tokens: ExuiEffectiveTokens
): string {
  if (typeof value === "string") {
    return value;
  }

  if (value.kind === "foundation") {
    if (value.path === "shadows.focus" && tokens.focusShadow) {
      return tokens.focusShadow;
    }
    return resolveFoundationShadow(value);
  }

  return resolveSemanticShadow(value, tokens);
}

function resolveFoundationShadow(
  reference: FoundationReference<ShadowFoundationReference>
): string {
  switch (reference.path) {
    case "shadows.small":
      return exuiTokens.shadows.small;
    case "shadows.medium":
      return exuiTokens.shadows.medium;
    case "shadows.large":
      return exuiTokens.shadows.large;
    case "shadows.focus":
      return exuiTokens.shadows.focus;
    case "shadows.invalid":
      return exuiTokens.shadows.invalid;
  }
}

function resolveSemanticShadow(
  reference: SemanticReference<ShadowSemanticTokenReference>,
  tokens: ExuiEffectiveTokens
): string {
  switch (reference.path) {
    case "shadow.card":
      return tokens.shadow.card;
    case "shadow.modal":
      return tokens.shadow.modal;
    case "shadow.menu":
      return tokens.shadow.menu;
    default:
      return unreachable(reference.path);
  }
}

function resolveState(
  recipe: InteractiveStateRecipe,
  tokens: ExuiEffectiveTokens
): ResolvedRecipe<InteractiveStateRecipe> {
  return {
    background: resolveColor(recipe.background, tokens),
    foreground: resolveColor(recipe.foreground, tokens),
    border: resolveColor(recipe.border, tokens),
    shadow: resolveShadow(recipe.shadow, tokens),
    opacity: recipe.opacity,
  };
}

function resolveButtonSize(
  recipe: ButtonSizeRecipe
): ResolvedRecipe<ButtonSizeRecipe> {
  return {
    height: recipe.height,
    paddingInline: recipe.paddingInline,
    gap: recipe.gap,
    radius: resolveRadius(recipe.radius),
    iconSize: recipe.iconSize,
    fontFamily: exuiTokens.typography.fontFamily,
    fontSize: resolveFontSize(recipe.fontSize),
    fontWeight: resolveFontWeight(recipe.fontWeight),
    lineHeight: resolveLineHeight(recipe.lineHeight),
  };
}

function resolveButtonVariant(
  recipe: ButtonVariantRecipe,
  tokens: ExuiEffectiveTokens
): ResolvedRecipe<ButtonVariantRecipe> {
  return {
    default: resolveState(recipe.default, tokens),
    hover: resolveState(recipe.hover, tokens),
    active: resolveState(recipe.active, tokens),
    focus: resolveState(recipe.focus, tokens),
    disabled: resolveState(recipe.disabled, tokens),
  };
}

function resolvePrimaryButtonVariant(
  recipe: ButtonVariantRecipe,
  tokens: ExuiEffectiveTokens,
  accent: ExuiAccentTheme
): ResolvedRecipe<ButtonVariantRecipe> {
  const resolved = resolveButtonVariant(recipe, tokens);
  return {
    default: {
      ...resolved.default,
      background: accent.primary,
      foreground: accent.primaryForeground,
      border: accent.primary,
    },
    hover: {
      ...resolved.hover,
      background: accent.primaryHover,
      foreground: accent.primaryForeground,
      border: accent.primaryHover,
    },
    active: {
      ...resolved.active,
      background: accent.primaryActive,
      foreground: accent.primaryForeground,
      border: accent.primaryActive,
    },
    focus: {
      ...resolved.focus,
      background: accent.primary,
      foreground: accent.primaryForeground,
    },
    disabled: {
      ...resolved.disabled,
      background: accent.primaryDisabled,
      border: accent.primaryDisabled,
    },
  };
}

function resolveSidebarGeometry(
  recipe: SidebarItemGeometryRecipe
): ResolvedRecipe<SidebarItemGeometryRecipe> {
  return {
    minHeight: recipe.minHeight,
    paddingInline: recipe.paddingInline,
    paddingBlock: recipe.paddingBlock,
    gap: recipe.gap,
    radius: resolveRadius(recipe.radius),
    iconSize: recipe.iconSize,
    fontSize: resolveFontSize(recipe.fontSize),
    fontWeight: resolveFontWeight(recipe.fontWeight),
  };
}

function resolveMenuItem(
  recipe: MenuItemRecipe,
  tokens: ExuiEffectiveTokens
): ResolvedRecipe<MenuItemRecipe> {
  return {
    paddingInline: recipe.paddingInline,
    paddingBlock: recipe.paddingBlock,
    gap: recipe.gap,
    radius: resolveRadius(recipe.radius),
    fontSize: resolveFontSize(recipe.fontSize),
    fontWeight: resolveFontWeight(recipe.fontWeight),
    default: resolveState(recipe.default, tokens),
    hover: resolveState(recipe.hover, tokens),
    active: resolveState(recipe.active, tokens),
    focus: resolveState(recipe.focus, tokens),
    disabled: resolveState(recipe.disabled, tokens),
    destructive: resolveState(recipe.destructive, tokens),
  };
}

function resolveMenuSubmenuTrigger(
  recipe: MenuSubmenuTriggerRecipe,
  tokens: ExuiEffectiveTokens
): ResolvedRecipe<MenuSubmenuTriggerRecipe> {
  return {
    paddingInline: recipe.paddingInline,
    paddingBlock: recipe.paddingBlock,
    gap: recipe.gap,
    radius: resolveRadius(recipe.radius),
    fontSize: resolveFontSize(recipe.fontSize),
    fontWeight: resolveFontWeight(recipe.fontWeight),
    default: resolveState(recipe.default, tokens),
    hover: resolveState(recipe.hover, tokens),
    active: resolveState(recipe.active, tokens),
    focus: resolveState(recipe.focus, tokens),
    disabled: resolveState(recipe.disabled, tokens),
  };
}

/**
 * Resolves the framework-neutral EXUI recipes into values styled-components
 * can consume without runtime string-path traversal.
 *
 * @param tokens the selected EXUI theme tokens.
 * @param accent the validated workspace primary override.
 * @returns the complete resolved component recipe collection.
 */
export function resolveComponentRecipes(
  tokens: ExuiEffectiveTokens,
  accent: ExuiAccentTheme
): ExuiComponentTheme {
  const recipes = componentRecipes;
  return {
    button: {
      defaultVariant: recipes.button.defaultVariant,
      defaultSize: recipes.button.defaultSize,
      primary: resolvePrimaryButtonVariant(
        recipes.button.primary,
        tokens,
        accent
      ),
      secondary: resolveButtonVariant(recipes.button.secondary, tokens),
      outline: resolveButtonVariant(recipes.button.outline, tokens),
      ghost: resolveButtonVariant(recipes.button.ghost, tokens),
      danger: resolveButtonVariant(recipes.button.danger, tokens),
      link: resolveButtonVariant(recipes.button.link, tokens),
      default: resolveButtonSize(recipes.button.default),
      small: resolveButtonSize(recipes.button.small),
      large: resolveButtonSize(recipes.button.large),
      icon: resolveButtonSize(recipes.button.icon),
      action: { radius: resolveRadius(recipes.button.action.radius) },
    },
    formControl: {
      base: {
        height: recipes.formControl.base.height,
        paddingInline: recipes.formControl.base.paddingInline,
        paddingBlock: recipes.formControl.base.paddingBlock,
        gap: recipes.formControl.base.gap,
        radius: resolveRadius(recipes.formControl.base.radius),
        fontFamily: exuiTokens.typography.fontFamily,
        fontSize: resolveFontSize(recipes.formControl.base.fontSize),
        fontWeight: resolveFontWeight(recipes.formControl.base.fontWeight),
        lineHeight: resolveLineHeight(recipes.formControl.base.lineHeight),
        background: resolveColor(recipes.formControl.base.background, tokens),
        foreground: resolveColor(recipes.formControl.base.foreground, tokens),
        border: resolveColor(recipes.formControl.base.border, tokens),
        placeholder: resolveColor(recipes.formControl.base.placeholder, tokens),
        shadow: resolveShadow(recipes.formControl.base.shadow, tokens),
      },
      hover: resolveState(recipes.formControl.hover, tokens),
      focus: resolveState(recipes.formControl.focus, tokens),
      disabled: resolveState(recipes.formControl.disabled, tokens),
      invalid: resolveState(recipes.formControl.invalid, tokens),
    },
    sidebarItem: {
      default: {
        ...resolveSidebarGeometry(recipes.sidebarItem.default),
        ...resolveState(recipes.sidebarItem.default, tokens),
      },
      hover: resolveState(recipes.sidebarItem.hover, tokens),
      active: resolveState(recipes.sidebarItem.active, tokens),
      focus: resolveState(recipes.sidebarItem.focus, tokens),
      disabled: resolveState(recipes.sidebarItem.disabled, tokens),
      nested: resolveSidebarGeometry(recipes.sidebarItem.nested),
      iconOnly: resolveSidebarGeometry(recipes.sidebarItem.iconOnly),
    },
    menu: {
      surface: {
        padding: recipes.menu.surface.padding,
        radius: resolveRadius(recipes.menu.surface.radius),
        background: resolveColor(recipes.menu.surface.background, tokens),
        foreground: resolveColor(recipes.menu.surface.foreground, tokens),
        border: resolveColor(recipes.menu.surface.border, tokens),
        shadow: resolveShadow(recipes.menu.surface.shadow, tokens),
      },
      item: resolveMenuItem(recipes.menu.item, tokens),
      checkedItem: {
        background: resolveColor(recipes.menu.checkedItem.background, tokens),
        foreground: resolveColor(recipes.menu.checkedItem.foreground, tokens),
        indicator: resolveColor(recipes.menu.checkedItem.indicator, tokens),
      },
      submenuTrigger: resolveMenuSubmenuTrigger(
        recipes.menu.submenuTrigger,
        tokens
      ),
      separator: {
        thickness: recipes.menu.separator.thickness,
        marginBlock: recipes.menu.separator.marginBlock,
        color: resolveColor(recipes.menu.separator.color, tokens),
      },
      shortcut: {
        marginInlineStart: recipes.menu.shortcut.marginInlineStart,
        fontSize: resolveFontSize(recipes.menu.shortcut.fontSize),
        letterSpacing: recipes.menu.shortcut.letterSpacing,
        foreground: resolveColor(recipes.menu.shortcut.foreground, tokens),
      },
    },
    dialog: {
      overlay: {
        background: resolveColor(recipes.dialog.overlay.background, tokens),
        backdropBlur: recipes.dialog.overlay.backdropBlur,
        duration: recipes.dialog.overlay.duration,
      },
      surface: {
        padding: recipes.dialog.surface.padding,
        gap: recipes.dialog.surface.gap,
        radius: resolveRadius(recipes.dialog.surface.radius),
        background: resolveColor(recipes.dialog.surface.background, tokens),
        foreground: resolveColor(recipes.dialog.surface.foreground, tokens),
        border: resolveColor(recipes.dialog.surface.border, tokens),
        shadow: resolveShadow(recipes.dialog.surface.shadow, tokens),
      },
      title: {
        fontFamily: exuiTokens.typography.fontFamily,
        fontSize: resolveFontSize(recipes.dialog.title.fontSize),
        fontWeight: resolveFontWeight(recipes.dialog.title.fontWeight),
        lineHeight: resolveLineHeight(recipes.dialog.title.lineHeight),
        foreground: resolveColor(recipes.dialog.title.foreground, tokens),
      },
      description: {
        fontFamily: exuiTokens.typography.fontFamily,
        fontSize: resolveFontSize(recipes.dialog.description.fontSize),
        fontWeight: resolveFontWeight(recipes.dialog.description.fontWeight),
        lineHeight: resolveLineHeight(recipes.dialog.description.lineHeight),
        foreground: resolveColor(recipes.dialog.description.foreground, tokens),
      },
      body: { gap: recipes.dialog.body.gap },
      footer: { gap: recipes.dialog.footer.gap },
      closeButtonPlacement: {
        top: recipes.dialog.closeButtonPlacement.top,
        right: recipes.dialog.closeButtonPlacement.right,
      },
    },
    tabs: {
      defaultVariant: recipes.tabs.defaultVariant,
      list: {
        height: recipes.tabs.list.height,
        padding: recipes.tabs.list.padding,
        gap: recipes.tabs.list.gap,
        radius: resolveRadius(recipes.tabs.list.radius),
        foreground: resolveColor(recipes.tabs.list.foreground, tokens),
      },
      trigger: {
        paddingInline: recipes.tabs.trigger.paddingInline,
        paddingBlock: recipes.tabs.trigger.paddingBlock,
        gap: recipes.tabs.trigger.gap,
        radius: resolveRadius(recipes.tabs.trigger.radius),
        fontSize: resolveFontSize(recipes.tabs.trigger.fontSize),
        fontWeight: resolveFontWeight(recipes.tabs.trigger.fontWeight),
        default: resolveState(recipes.tabs.trigger.default, tokens),
        hover: resolveState(recipes.tabs.trigger.hover, tokens),
        selected: resolveState(recipes.tabs.trigger.selected, tokens),
        focus: resolveState(recipes.tabs.trigger.focus, tokens),
        disabled: resolveState(recipes.tabs.trigger.disabled, tokens),
      },
      indicator: {
        thickness: recipes.tabs.indicator.thickness,
        offset: recipes.tabs.indicator.offset,
        background: resolveColor(recipes.tabs.indicator.background, tokens),
      },
      default: {
        listBackground: resolveColor(
          recipes.tabs.default.listBackground,
          tokens
        ),
        indicatorOpacity: recipes.tabs.default.indicatorOpacity,
      },
      line: {
        listBackground: resolveColor(recipes.tabs.line.listBackground, tokens),
        triggerSelectedBackground: resolveColor(
          recipes.tabs.line.triggerSelectedBackground,
          tokens
        ),
        indicatorOpacity: recipes.tabs.line.indicatorOpacity,
      },
      primary: {
        listBackground: resolveColor(
          recipes.tabs.primary.listBackground,
          tokens
        ),
        indicatorOpacity: recipes.tabs.primary.indicatorOpacity,
        selected: resolveState(recipes.tabs.primary.selected, tokens),
      },
    },
  };
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
  tokens: ExuiEffectiveTokens,
  customTheme?: Partial<CustomTheme>
): ExuiAccentTheme {
  const requestedAccent = customTheme?.accent;
  const requestedAccentText = customTheme?.accentText;

  if (!isValidHexColor(requestedAccent)) {
    return {
      primary: tokens.control.primary,
      primaryForeground: isValidHexColor(requestedAccentText)
        ? requestedAccentText
        : tokens.control.primaryForeground,
      primaryHover: tokens.control.hover,
      primaryActive: tokens.control.active,
      primaryDisabled: tokens.control.disabled,
      focusRing: tokens.control.focusRing,
    };
  }

  const primary = requestedAccent;
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
  customTheme?: Partial<CustomTheme>,
  effectiveTokens?: ExuiEffectiveTokens
): ExuiSemanticTheme {
  const tokens: ExuiEffectiveTokens =
    effectiveTokens ?? exuiTokens.themes[mode];
  const accent = resolveAccent(tokens, customTheme);
  const { typography, radii, shadows, density } = exuiTokens;
  const components = resolveComponentRecipes(tokens, accent);

  return {
    mode,
    tokens,
    glass: tokens.glass,
    surface: {
      background: tokens.surface.background,
      surface: tokens.surface.card,
      surfaceSecondary: tokens.surface.secondary,
      surfaceTertiary: tokens.surface.tertiary,
      elevated: tokens.surface.popover,
      overlay: tokens.surface.overlay,
      muted: tokens.surface.tertiary,
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
      neutralHover: components.button.secondary.hover.background,
      danger: tokens.control.danger,
      dangerForeground: tokens.control.dangerForeground,
      dangerHover: components.button.danger.hover.background,
      dangerActive: components.button.danger.active.background,
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
        background: components.menu.surface.background,
        foreground: components.menu.surface.foreground,
        foregroundDisabled: components.menu.item.disabled.foreground,
        radius: components.menu.surface.radius,
        shadow: components.menu.surface.shadow,
        itemBackgroundHover: components.menu.item.hover.background,
        itemForegroundHover: components.menu.item.hover.foreground,
        itemBackgroundDanger: components.menu.item.destructive.background,
        itemForegroundDanger: components.menu.item.destructive.foreground,
        itemBackgroundSelected: components.menu.checkedItem.background,
        itemForegroundSelected: components.menu.checkedItem.foreground,
        separator: components.menu.separator.color,
      },
      dialog: {
        background: components.dialog.surface.background,
        foreground: components.dialog.surface.foreground,
        foregroundMuted: components.dialog.description.foreground,
        overlay: components.dialog.overlay.background,
        radius: components.dialog.surface.radius,
        shadow: components.dialog.surface.shadow,
      },
      tooltip: {
        background: tokens.text.primary,
        foreground: tokens.surface.background,
        border: "transparent",
        radius: radii.extraLarge,
        shadow: "none",
      },
      toast: {
        background: tokens.surface.popover,
        foreground: tokens.surface.popoverForeground,
        border: tokens.border.default,
        radius: radii.large,
        shadow: shadows.large,
      },
      tab: {
        foreground: components.tabs.trigger.default.foreground,
        foregroundHover: components.tabs.trigger.hover.foreground,
        foregroundActive: components.tabs.trigger.selected.foreground,
        indicator: components.tabs.indicator.background,
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
      focus: tokens.focusShadow ?? shadows.focus,
      invalid: shadows.invalid,
    },
    components,
  };
}

/**
 * Maps the ExUI tokens of a theme mode onto the Outline legacy theme fields
 * that the token contract now owns.
 *
 * Product colors, including sidebar surfaces and editor notices, resolve from
 * semantic tokens. Document identity colors retain the legacy brand palette.
 *
 * @param mode the ExUI theme group to select.
 * @param customTheme the optional workspace brand override.
 * @returns the legacy theme fields owned by the token contract.
 */
export function buildExuiLegacyOverrides(
  mode: ExuiThemeMode,
  customTheme?: Partial<CustomTheme>,
  effectiveTokens?: ExuiEffectiveTokens
): Partial<DefaultTheme> {
  const tokens: ExuiEffectiveTokens =
    effectiveTokens ?? exuiTokens.themes[mode];
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

    sidebarBackground: tokens.sidebar.background,
    sidebarText: tokens.sidebar.foreground,
    sidebarHoverBackground: tokens.sidebar.accent,
    sidebarActiveBackground: tokens.surface.background,
    sidebarControlHoverBackground: tokens.sidebar.accent,
    sidebarDraftBorder: tokens.sidebar.border,

    noticeInfoBackground: tokens.feedback.info,
    noticeInfoText: tokens.text.primary,
    noticeTipBackground: tokens.feedback.warning,
    noticeTipText: tokens.text.primary,
    noticeWarningBackground: tokens.feedback.danger,
    noticeWarningText: tokens.text.primary,
    noticeSuccessBackground: tokens.feedback.success,
    noticeSuccessText: tokens.text.primary,

    text: tokens.text.primary,
    textSecondary: tokens.text.secondary,
    textTertiary: tokens.text.tertiary,
    textDiffInserted: tokens.text.primary,
    textDiffInsertedBackground: transparentize(0.85, tokens.feedback.success),
    textDiffDeleted: tokens.text.secondary,
    textDiffDeletedBackground: transparentize(0.85, tokens.feedback.danger),
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
    progressBarBackground: tokens.surface.tertiary,
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
  customTheme?: Partial<CustomTheme>,
  effectiveTokens?: ExuiEffectiveTokens
): DefaultTheme {
  return {
    ...legacy,
    ...buildExuiLegacyOverrides(mode, customTheme, effectiveTokens),
    exui: buildExuiSemanticTheme(mode, customTheme, effectiveTokens),
  };
}
