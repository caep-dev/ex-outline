import { createGlobalStyle } from "styled-components";
import styledNormalize from "styled-normalize";
import { breakpoints, depths, s } from ".";
import { EditorStyleHelper } from "../editor/styles/EditorStyleHelper";

type Props = {
  staticHTML?: boolean;
  useCursorPointer?: boolean;
};

export default createGlobalStyle<Props>`
  ${styledNormalize}

  * {
    box-sizing: border-box;
  }

  html {
    --line-height-body: 1.5;
    --font-size-body: 16px;
  }

  /*
   * Namespaced mirror of the ExUI theme, for DOM that cannot read the
   * styled-components theme: editor-generated markup, portals and non-React
   * surfaces. Every variable is prefixed so it cannot collide with plugin,
   * embed or third-party styles.
   */
  html {
    --exui-font-family: ${(props) => props.theme.exui.typography.fontFamily};
    --exui-font-family-mono: ${(props) =>
      props.theme.exui.typography.fontFamilyMono};
    --exui-body-font-size: ${(props) => props.theme.exui.typography.bodyFontSize};
    --exui-body-line-height: ${(props) =>
      props.theme.exui.typography.bodyLineHeight};

    --exui-background: ${(props) => props.theme.exui.surface.background};
    --exui-surface: ${(props) => props.theme.exui.surface.surface};
    --exui-surface-secondary: ${(props) =>
      props.theme.exui.surface.surfaceSecondary};
    --exui-surface-tertiary: ${(props) =>
      props.theme.exui.surface.surfaceTertiary};
    --exui-surface-elevated: ${(props) => props.theme.exui.surface.elevated};
    --exui-overlay: ${(props) => props.theme.exui.surface.overlay};

    --exui-border: ${(props) => props.theme.exui.surface.border};
    --exui-border-strong: ${(props) => props.theme.exui.surface.borderStrong};
    --exui-border-input: ${(props) => props.theme.exui.surface.borderInput};
    --exui-border-focused: ${(props) => props.theme.exui.surface.borderFocused};
    --exui-divider: ${(props) => props.theme.exui.surface.divider};

    --exui-foreground: ${(props) => props.theme.exui.surface.foreground};
    --exui-foreground-secondary: ${(props) =>
      props.theme.exui.surface.foregroundSecondary};
    --exui-foreground-tertiary: ${(props) =>
      props.theme.exui.surface.foregroundTertiary};
    --exui-placeholder: ${(props) => props.theme.exui.surface.placeholder};
    --exui-foreground-inverse: ${(props) => props.theme.exui.surface.inverse};
    --exui-link: ${(props) => props.theme.exui.surface.link};

    --exui-primary: ${(props) => props.theme.exui.control.primary};
    --exui-primary-foreground: ${(props) =>
      props.theme.exui.control.primaryForeground};
    --exui-primary-hover: ${(props) => props.theme.exui.control.primaryHover};
    --exui-primary-active: ${(props) => props.theme.exui.control.primaryActive};
    --exui-primary-disabled: ${(props) =>
      props.theme.exui.control.primaryDisabled};
    --exui-focus-ring: ${(props) => props.theme.exui.control.focusRing};
    --exui-neutral: ${(props) => props.theme.exui.control.neutral};
    --exui-neutral-foreground: ${(props) =>
      props.theme.exui.control.neutralForeground};
    --exui-danger: ${(props) => props.theme.exui.control.danger};
    --exui-danger-foreground: ${(props) =>
      props.theme.exui.control.dangerForeground};
    --exui-danger-hover: ${(props) => props.theme.exui.control.dangerHover};
    --exui-invalid: ${(props) => props.theme.exui.control.invalid};
    --exui-selected: ${(props) => props.theme.exui.control.selected};

    --exui-warning: ${(props) => props.theme.exui.feedback.warning};
    --exui-warning-foreground: ${(props) =>
      props.theme.exui.feedback.warningForeground};
    --exui-success: ${(props) => props.theme.exui.feedback.success};
    --exui-success-foreground: ${(props) =>
      props.theme.exui.feedback.successForeground};
    --exui-info: ${(props) => props.theme.exui.feedback.info};
    --exui-info-foreground: ${(props) => props.theme.exui.feedback.infoForeground};

    --exui-radius-small: ${(props) => props.theme.exui.radii.small};
    --exui-radius-medium: ${(props) => props.theme.exui.radii.medium};
    --exui-radius-large: ${(props) => props.theme.exui.radii.large};
    --exui-radius-extra-large: ${(props) => props.theme.exui.radii.extraLarge};
    --exui-radius-full: ${(props) => props.theme.exui.radii.full};

    --exui-shadow-small: ${(props) => props.theme.exui.shadow.small};
    --exui-shadow-medium: ${(props) => props.theme.exui.shadow.medium};
    --exui-shadow-large: ${(props) => props.theme.exui.shadow.large};

    --exui-density-standard-height: ${(props) =>
      props.theme.exui.density.standard.controlHeight};
    --exui-density-standard-padding: ${(props) =>
      props.theme.exui.density.standard.controlPaddingInline};
    --exui-density-standard-gap: ${(props) =>
      props.theme.exui.density.standard.controlGap};
    --exui-density-standard-radius: ${(props) =>
      props.theme.exui.density.standard.controlRadius};
    --exui-density-compact-height: ${(props) =>
      props.theme.exui.density.compact.controlHeight};
    --exui-density-compact-padding: ${(props) =>
      props.theme.exui.density.compact.controlPaddingInline};
    --exui-density-compact-gap: ${(props) =>
      props.theme.exui.density.compact.controlGap};
    --exui-density-compact-radius: ${(props) =>
      props.theme.exui.density.compact.controlRadius};

    --exui-menu-background: ${(props) => props.theme.exui.overlay.menu.background};
    --exui-menu-foreground: ${(props) => props.theme.exui.overlay.menu.foreground};
    --exui-menu-shadow: ${(props) => props.theme.exui.overlay.menu.shadow};
    --exui-menu-radius: ${(props) => props.theme.exui.overlay.menu.radius};
    --exui-dialog-background: ${(props) =>
      props.theme.exui.overlay.dialog.background};
    --exui-dialog-overlay: ${(props) => props.theme.exui.overlay.dialog.overlay};
    --exui-dialog-shadow: ${(props) => props.theme.exui.overlay.dialog.shadow};
    --exui-dialog-radius: ${(props) => props.theme.exui.overlay.dialog.radius};
    --exui-tooltip-background: ${(props) =>
      props.theme.exui.overlay.tooltip.background};
    --exui-tooltip-foreground: ${(props) =>
      props.theme.exui.overlay.tooltip.foreground};
    --exui-toast-background: ${(props) =>
      props.theme.exui.overlay.toast.background};
    --exui-toast-foreground: ${(props) =>
      props.theme.exui.overlay.toast.foreground};
    --exui-toast-border: ${(props) => props.theme.exui.overlay.toast.border};
    --exui-tab-foreground: ${(props) => props.theme.exui.overlay.tab.foreground};
    --exui-tab-indicator: ${(props) => props.theme.exui.overlay.tab.indicator};
  }

  html,
  body {
    width: 100%;
    ${(props) => (props.staticHTML ? "" : "height: 100%;")}
    margin: 0;
    padding: 0;
    print-color-adjust: exact;
    --pointer: ${(props) => (props.useCursorPointer ? "pointer" : "default")};
    --scrollbar-width: calc(100vw - 100cqw);
    overscroll-behavior-x: none;

    @media print {
      background: none !important;
    }

    --line-height-p: var(--line-height-body);
    --line-height-h: 1.25;
  }

  body,
  button,
  input,
  optgroup,
  select,
  textarea {
    font-family: ${(props) =>
      props.staticHTML
        ? props.theme.fontFamily
        : props.theme.exui.typography.fontFamily};
  }

  #root {
    font-family: ${(props) => props.theme.exui.typography.fontFamily};
  }

  #root button,
  #root input,
  #root optgroup,
  #root select,
  #root textarea {
    font-family: inherit;
  }

  body {
    font-size: var(--font-size-body);
    line-height: var(--line-height-body);
    color: ${s("text")};
    overscroll-behavior-y: none;
    -moz-osx-font-smoothing: grayscale;
    -webkit-font-smoothing: antialiased;
    text-rendering: optimizeLegibility;

    ${(props) => (props.staticHTML ? "" : "width: 100vw;")}
    overflow-x: hidden;
    padding-right: calc(0 - var(--removed-body-scroll-bar-size)) !important;
  }

  @media (min-width: ${breakpoints.tablet}px) {
    html,
    body {
      min-height: ${(props) => (props.staticHTML ? "0" : "100vh")};
    }
  }

  @media print {
    #root {
      font-family: ${s("fontFamily")};
    }
  }

  @media (min-width: ${breakpoints.tablet}px) and (display-mode: standalone) {
    body:after {
      content: "";
      display: block;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 1px;
      background: ${(props) => props.theme.titleBarDivider};
      z-index: ${depths.titleBarDivider};
    }
  }

  a {
    color: ${(props) => props.theme.link};
    text-decoration: none;
    cursor: pointer;
  }

  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    font-weight: 500;
    line-height: var(--line-height-h);
    margin-top: 1em;
    margin-bottom: 0.5em;
  }
  h1 { font-size: 2.25rem; }
  h2 { font-size: 1.625rem; }
  h3 { font-size: 1.25rem; }
  h4 { font-size: 1.125rem; }
  h5 { font-size: 1rem; }

  p,
  dl,
  ol,
  ul,
  pre,
  blockquote {
    margin-top: 1em;
    margin-bottom: 1em;
  }

  hr {
    border: 0;
    height: 0;
    border-top: 1px solid ${s("divider")};
  }

  :focus-visible {
    outline-color: ${s("accent")};
    outline-offset: -1px;
    outline-width: initial;
  }

  :root {
    --sat: env(safe-area-inset-top);
    --sar: env(safe-area-inset-right);
    --sab: env(safe-area-inset-bottom);
    --sal: env(safe-area-inset-left);
  }

  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }

  /* Mermaid.js injects these into the root of the page. It's very annoying, but we have to deal with it or they affect layout */
  [id^="doffscreen-mermaid"] {
      position: absolute !important;
      left: -9999px !important;
      top: -9999px !important;
  }

  /* Table row/column drag and drop cursor */
  &.${EditorStyleHelper.tableDragging},
  &.${EditorStyleHelper.tableDragging} *,
  &.${EditorStyleHelper.tableDragging} *::before,
  &.${EditorStyleHelper.tableDragging} *::after {
    cursor: grabbing !important;
  }

  /* Image/media resize drag cursor */
  &.${EditorStyleHelper.resizeDragging},
  &.${EditorStyleHelper.resizeDragging} *,
  &.${EditorStyleHelper.resizeDragging} *::before,
  &.${EditorStyleHelper.resizeDragging} *::after {
    cursor: var(--resize-drag-cursor) !important;
  }
`;
