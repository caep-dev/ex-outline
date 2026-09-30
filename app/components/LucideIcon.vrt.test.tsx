import type { ReactElement } from "react";
import { render, unmountComponentAtNode } from "react-dom";
import { act } from "react-dom/test-utils";
import { ThemeProvider } from "styled-components";
import type { DefaultTheme } from "styled-components";
import { afterEach, describe, expect, it } from "vitest";
import {
  ArchiveIcon,
  ShareIcon,
  StarredIcon,
  UnstarredIcon,
  TrashIcon,
} from "@shared/components/LucideIcon";
import GlobalStyles from "@shared/styles/globals";
import {
  buildLightTheme,
  buildDarkTheme,
  buildPitchBlackTheme,
} from "@shared/styles/theme";
import Button from "~/components/Button";
import { MenuButton } from "~/components/primitives/components/Menu";
import SidebarLink from "~/components/Sidebar/components/SidebarLink";

let container: HTMLDivElement;

afterEach(() => {
  if (container) {
    act(() => {
      unmountComponentAtNode(container);
    });
    container.remove();
  }
});

/**
 * Mounts real controls so the browser resolves their SVG state styles.
 *
 * @param element the control to mount.
 * @param theme the Outline theme to apply.
 * @returns the mounted container.
 */
function mount(element: ReactElement, theme: DefaultTheme) {
  container = document.createElement("div");
  document.body.append(container);
  act(() => {
    render(
      <ThemeProvider theme={theme}>
        <GlobalStyles />
        {element}
      </ThemeProvider>,
      container
    );
  });
  return container;
}

for (const { name, theme } of [
  { name: "light", theme: buildLightTheme() },
  { name: "dark", theme: buildDarkTheme() },
  { name: "pitch-black", theme: buildPitchBlackTheme() },
]) {
  describe(`Lucide controls in ${name}`, () => {
    it("raises the trash lid for an active drag target", () => {
      mount(
        <SidebarLink label="Trash" icon={<TrashIcon open />} isActiveDrop />,
        theme
      );
      const lid = container.querySelector("svg path:nth-last-child(2)");
      if (!lid) {
        throw new Error("The trash lid did not render.");
      }

      expect(getComputedStyle(lid).transform).not.toBe("none");
      expect(container.querySelector("svg")?.hasAttribute("open")).toBe(false);
    });

    it("keeps disabled button icons hollow and at the existing control size", () => {
      mount(
        <Button icon={<ShareIcon size={20} />} aria-label="Share" disabled />,
        theme
      );
      const button = container.querySelector("button");
      const svg = container.querySelector("svg");
      if (!button || !svg) {
        throw new Error("The share control did not render.");
      }

      expect(button.disabled).toBe(true);
      expect(button.getAttribute("aria-label")).toBe("Share");
      expect(getComputedStyle(svg).fill).toBe("none");
      expect(getComputedStyle(svg).stroke).toBe(getComputedStyle(button).color);
      expect(getComputedStyle(svg).width).toBe("16px");
    });

    it("keeps menu outlines hollow and selected stars filled", () => {
      mount(
        <>
          <MenuButton $dangerous disabled>
            <ShareIcon />
            Share
          </MenuButton>
          <MenuButton>
            <StarredIcon />
            Starred
          </MenuButton>
          <MenuButton>
            <UnstarredIcon />
            Unstarred
          </MenuButton>
          <MenuButton>
            <StarredIcon color="#efab12" />
            Colored star
          </MenuButton>
        </>,
        theme
      );
      const icons = container.querySelectorAll("svg");
      expect(icons).toHaveLength(4);
      expect(getComputedStyle(icons[0]).fill).toBe("none");
      expect(getComputedStyle(icons[0]).stroke).toBe(
        getComputedStyle(icons[0]).color
      );
      expect(getComputedStyle(icons[1]).fill).toBe(
        getComputedStyle(icons[1]).color
      );
      expect(getComputedStyle(icons[2]).fill).toBe("none");
      expect(getComputedStyle(icons[3]).fill).toBe("rgb(239, 171, 18)");
      expect(getComputedStyle(icons[3]).stroke).toBe("rgb(239, 171, 18)");
    });

    it("keeps drag-target sidebar icons hollow and readable", () => {
      mount(
        <SidebarLink label="Archive" icon={<ArchiveIcon />} isActiveDrop />,
        theme
      );
      const svg = container.querySelector("svg");
      if (!svg) {
        throw new Error("The archive icon did not render.");
      }
      const foreground = document.createElement("span");
      foreground.style.color = theme.exui.control.primaryForeground;
      container.append(foreground);

      expect(getComputedStyle(svg).fill).toBe("none");
      expect(getComputedStyle(svg).stroke).toBe(
        getComputedStyle(foreground).color
      );
    });
  });
}
