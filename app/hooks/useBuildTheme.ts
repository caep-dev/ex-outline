import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { breakpoints } from "@shared/styles";
import {
  buildDarkTheme,
  buildLightTheme,
  buildPitchBlackTheme,
} from "@shared/styles/theme";
import type { CustomTheme } from "@shared/types";
import { isWebsiteIntegration } from "~/utils/websiteIntegration";
import {
  readWebsiteThemePalette,
  type WebsiteThemePalette,
} from "~/utils/websiteThemePalette";
import { Theme } from "~/stores/UiStore";
import useMediaQuery from "~/hooks/useMediaQuery";
import useStores from "./useStores";
import useQuery from "./useQuery";

/**
 * Builds a theme based on the current user's preferences, the current device
 * and the custom theme provided.
 *
 * @param customTheme Custom theme to merge with the default theme
 * @param overrideTheme Optional override the theme to use
 * @returns The theme to use
 */
export default function useBuildTheme(
  customTheme: Partial<CustomTheme> = {},
  overrideTheme?: Theme
) {
  const integrated = isWebsiteIntegration();
  const [palette, setPalette] = useState<WebsiteThemePalette>();
  useLayoutEffect(() => {
    if (integrated) {
      setPalette(readWebsiteThemePalette());
    }
  }, [integrated]);
  const { ui } = useStores();
  const params = useQuery();
  const isMobile = useMediaQuery(`(max-width: ${breakpoints.tablet}px)`);
  const isPrinting = useMediaQuery("print");
  const queryTheme = (params.get("theme") as Theme) || undefined;

  // Store the theme override in UiStore so it persists during navigation
  useEffect(() => {
    if (
      queryTheme &&
      (queryTheme === Theme.Light || queryTheme === Theme.Dark)
    ) {
      ui.setThemeOverride(queryTheme);
    }
  }, [queryTheme, ui, integrated]);

  const resolvedTheme = overrideTheme ?? ui.resolvedTheme;

  const theme = useMemo(() => {
    if (integrated) {
      const mode = isPrinting || resolvedTheme !== "dark" ? "light" : "dark";
      return mode === "dark"
        ? buildDarkTheme({}, palette?.dark)
        : buildLightTheme({}, palette?.light);
    }
    if (isPrinting) {
      return buildLightTheme(customTheme);
    }
    if (resolvedTheme === "dark") {
      return isMobile
        ? buildPitchBlackTheme(customTheme)
        : buildDarkTheme(customTheme);
    }
    return buildLightTheme(customTheme);
  }, [integrated, palette, customTheme, isMobile, isPrinting, resolvedTheme]);

  return theme;
}
