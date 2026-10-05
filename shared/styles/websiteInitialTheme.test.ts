import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import { exuiTokens } from "@exre/exui/tokens";

const template = readFileSync("server/static/index.html", "utf8");
const script = template.match(
  /<script nonce="\{csp-nonce\}">([\s\S]*?)<\/script>/
)?.[1];

it.each([null, "system", "light", "dark", "broken"])(
  "executes real initial template for %s with system dark",
  (preference) => {
    const dom = new JSDOM(template, {
      url: "http://example.test/docs/",
      runScripts: "outside-only",
    });
    const { window } = dom;
    if (preference !== null) {
      window.localStorage.setItem("theme", preference);
    }
    window.matchMedia = vi.fn().mockReturnValue({ matches: true });
    window.websiteThemePalette = {
      light: exuiTokens.themes.light.surface.background,
      dark: exuiTokens.themes.dark.surface.background,
    };
    window.eval(script ?? "");
    const mode = preference === "light" ? "light" : "dark";
    expect(window.document.documentElement.classList.contains(mode)).toBe(true);
    expect(
      window.document
        .querySelector('meta[name="theme-color"]')
        ?.getAttribute("content")
    ).toBe(exuiTokens.themes[mode].surface.background);
    expect(window.document.documentElement.style.colorScheme).toBe(mode);
    expect(
      window.document.documentElement.classList.contains(
        "website-theme-profile"
      )
    ).toBe(true);
    expect(window.localStorage.getItem("theme")).toBe(preference);
    dom.window.close();
  }
);

it("contains inaccessible storage and retains the standalone branch", () => {
  const dom = new JSDOM(template, {
    url: "http://example.test/",
    runScripts: "outside-only",
  });
  const { window } = dom;
  window.websiteThemePalette = { light: "white", dark: "black" };
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    get: () => {
      throw new Error("denied");
    },
  });
  expect(() => window.eval(script ?? "")).not.toThrow();
  expect(window.document.documentElement.classList.contains("light")).toBe(
    true
  );
  dom.window.close();
  const standalone = new JSDOM(template, {
    url: "http://example.test/",
    runScripts: "outside-only",
  });
  standalone.window.localStorage.setItem("theme", "dark");
  standalone.window.eval(script ?? "");
  expect(
    standalone.window.document.documentElement.classList.contains(
      "website-theme-profile"
    )
  ).toBe(false);
  standalone.window.close();
});
