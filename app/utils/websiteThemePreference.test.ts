import {
  readWebsiteThemePreference,
  writeWebsiteThemePreference,
  subscribeWebsiteThemePreference,
} from "./websiteThemePreference";

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

beforeEach(() => window.localStorage.clear());

it.each([null, "broken", '"dark"', "system", "dark", "light"])(
  "parses raw preference %s without writing",
  (value) => {
    if (value !== null) {
      window.localStorage.setItem("theme", value);
    }
    const write = vi.spyOn(local, "setItem");
    write.mockClear();
    expect(readWebsiteThemePreference()).toBe(
      value === "dark" || value === "light" ? value : "system"
    );
    expect(write).not.toHaveBeenCalled();
    write.mockRestore();
  }
);

it("writes raw strings and contains storage exceptions", () => {
  expect(writeWebsiteThemePreference("dark")).toBe(true);
  expect(window.localStorage.getItem("theme")).toBe("dark");
  const write = vi.spyOn(local, "setItem").mockImplementation(() => {
    throw new Error("denied");
  });
  expect(writeWebsiteThemePreference("light")).toBe(false);
  write.mockRestore();
  const read = vi.spyOn(local, "getItem").mockImplementation(() => {
    throw new Error("denied");
  });
  expect(readWebsiteThemePreference()).toBe("system");
  read.mockRestore();
});

it("rereads latest storage, handles clear and restoration, and releases listeners", () => {
  const change = vi.fn();
  const release = subscribeWebsiteThemePreference(change);
  expect(change).toHaveBeenLastCalledWith("system");
  window.localStorage.setItem("theme", "dark");
  window.dispatchEvent(
    Object.assign(new Event("storage"), {
      key: "theme",
      newValue: "light",
      storageArea: window.localStorage,
    })
  );
  expect(change).toHaveBeenLastCalledWith("dark");
  const count = change.mock.calls.length;
  window.dispatchEvent(
    Object.assign(new Event("storage"), {
      key: "theme",
      storageArea: window.sessionStorage,
    })
  );
  window.dispatchEvent(
    Object.assign(new Event("storage"), {
      key: "UI_STORE",
      storageArea: window.localStorage,
    })
  );
  expect(change).toHaveBeenCalledTimes(count);
  window.localStorage.clear();
  window.dispatchEvent(
    Object.assign(new Event("storage"), {
      key: null,
      storageArea: window.localStorage,
    })
  );
  expect(change).toHaveBeenLastCalledWith("system");
  window.localStorage.setItem("theme", "light");
  window.dispatchEvent(new Event("pageshow"));
  expect(change).toHaveBeenLastCalledWith("light");
  document.dispatchEvent(new Event("visibilitychange"));
  release();
  const last = change.mock.calls.length;
  window.dispatchEvent(new Event("pageshow"));
  window.dispatchEvent(
    Object.assign(new Event("storage"), {
      key: "theme",
      storageArea: window.localStorage,
    })
  );
  expect(change).toHaveBeenCalledTimes(last);
});
