import { useLayoutEffect } from "react";
import { useTheme } from "styled-components";
import { isWebsiteIntegration } from "~/utils/websiteIntegration";
import { light } from "@shared/styles/theme";

export default function PageTheme() {
  const theme = useTheme();

  useLayoutEffect(() => {
    // theme-color adjusts the title bar color for desktop PWA
    const themeElement = document.querySelector('meta[name="theme-color"]');

    // color-scheme controls user-agent controls, scrollbars and the page canvas
    const colorSchemeElement = document.querySelector(
      'meta[name="color-scheme"]'
    );

    const applyTheme = (background: string, isDark: boolean) => {
      if (isWebsiteIntegration()) {
        const root = document.documentElement;
        root.classList.add("website-theme-profile");
        root.classList.toggle("dark", isDark);
        root.classList.toggle("light", !isDark);
        root.style.colorScheme = isDark ? "dark" : "light";
        const container = document.getElementById("root");
        if (container) {
          container.style.background = background;
        }
      }
      // wider page background beyond the React root
      if (document.body) {
        document.body.style.background = background;
      }
      themeElement?.setAttribute("content", background);
      colorSchemeElement?.setAttribute("content", isDark ? "dark" : "light");
    };

    applyTheme(
      theme.background,
      theme.isDark && !window.matchMedia("print").matches
    );

    const handleChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        applyTheme(light.background, false);
      } else {
        applyTheme(theme.background, theme.isDark);
      }
    };

    // Printing always uses the light theme. window.print blocks the main thread
    // so React cannot re-render in time to update the background – handle the
    // print media query synchronously and apply the light theme imperatively.
    const mediaQuery = window.matchMedia("print");
    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  return null;
}
