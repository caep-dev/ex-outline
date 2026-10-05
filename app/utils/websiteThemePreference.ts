/** The same raw-string preference consumed by Website's ExUI provider. */
export type WebsiteThemePreference = "light" | "dark" | "system";

/** Reads the current shared preference without migrating Outline's UI_STORE. */
export function readWebsiteThemePreference(): WebsiteThemePreference {
  try {
    const value = window.localStorage.getItem("theme");
    return value === "light" || value === "dark" ? value : "system";
  } catch {
    return "system";
  }
}

/** Persists a raw preference; unavailable storage leaves the local UI usable. */
export function writeWebsiteThemePreference(
  theme: WebsiteThemePreference
): boolean {
  try {
    window.localStorage.setItem("theme", theme);
    return true;
  } catch {
    return false;
  }
}

/** Subscribes to current storage, including missed events during page suspension. */
export function subscribeWebsiteThemePreference(
  onChange: (theme: WebsiteThemePreference) => void
): () => void {
  const reconcile = () => onChange(readWebsiteThemePreference());
  const handleStorage = (event: StorageEvent) => {
    try {
      if (
        event.storageArea === window.localStorage &&
        (event.key === "theme" || event.key === null)
      ) {
        reconcile();
      }
    } catch {
      // Accessing storageArea's counterpart can itself fail under browser policy.
    }
  };
  const handleVisibility = () => {
    if (document.visibilityState === "visible") {
      reconcile();
    }
  };
  window.addEventListener("storage", handleStorage);
  window.addEventListener("pageshow", reconcile);
  document.addEventListener("visibilitychange", handleVisibility);
  reconcile();
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener("pageshow", reconcile);
    document.removeEventListener("visibilitychange", handleVisibility);
  };
}
