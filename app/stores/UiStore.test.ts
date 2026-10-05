import Storage from "@shared/utils/Storage";
import env from "~/env";
import type RootStore from "./RootStore";
import UiStore, { Theme } from "./UiStore";

const testStorage = new Map<string, string>();
const local = {
  getItem: vi.fn((key: string) => testStorage.get(key) ?? null),
  setItem: vi.fn((key: string, value: string) => {
    testStorage.set(key, value);
  }),
  clear: () => testStorage.clear(),
};
beforeEach(() => {
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: local,
  });
});

beforeEach(() => {
  env.WEBSITE_INTEGRATION_ENABLED = true;
  window.localStorage.clear();
  Storage.set("UI_STORE", { theme: Theme.Light, sidebarCollapsed: true });
});

it("ignores old themes, preserves other UI fields and never migrates preference", () => {
  window.localStorage.setItem("theme", "dark");
  const ui = new UiStore({} as RootStore);
  expect(ui.theme).toBe(Theme.Dark);
  expect(ui.sidebarCollapsed).toBe(true);
  ui.collapseSidebar();
  expect(Storage.get("UI_STORE").theme).toBe(Theme.Light);
  expect(window.localStorage.getItem("theme")).toBe("dark");
  ui.syncWebsiteTheme("system");
  expect(ui.theme).toBe(Theme.System);
  expect(window.localStorage.getItem("theme")).toBe("dark");
  ui.setThemeOverride(Theme.Light);
  expect(ui.themeOverride).toBeUndefined();
  window.dispatchEvent(
    Object.assign(new Event("storage"), {
      key: "UI_STORE",
      newValue: JSON.stringify({ theme: "light", sidebarCollapsed: false }),
    })
  );
  expect(ui.theme).toBe(Theme.System);
  expect(ui.sidebarCollapsed).toBe(false);
  ui.setTheme(Theme.Light);
  expect(window.localStorage.getItem("theme")).toBe("light");
});

it("retains standalone storage and theme overrides", () => {
  env.WEBSITE_INTEGRATION_ENABLED = false;
  window.localStorage.setItem("theme", "dark");
  const ui = new UiStore({} as RootStore);
  expect(ui.theme).toBe(Theme.Light);
  ui.setTheme(Theme.Dark);
  expect(Storage.get("UI_STORE").theme).toBe(Theme.Dark);
  ui.setThemeOverride(Theme.Light);
  expect(ui.resolvedTheme).toBe(Theme.Light);
});
