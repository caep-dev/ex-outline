import { useEffect } from "react";
import useStores from "~/hooks/useStores";
import { isWebsiteIntegration } from "~/utils/websiteIntegration";
import { subscribeWebsiteThemePreference } from "~/utils/websiteThemePreference";

/** Owns the shared preference subscription for the lifetime of the app tree. */
export function WebsiteThemePreferenceSync() {
  const { ui } = useStores();
  useEffect(() => {
    if (isWebsiteIntegration()) {
      return subscribeWebsiteThemePreference(ui.syncWebsiteTheme);
    }
    return undefined;
  }, [ui]);
  return null;
}
