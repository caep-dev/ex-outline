import { cleanup, render, act } from "@testing-library/react";
import { ThemeProvider } from "styled-components";
import { buildDarkTheme, light } from "@shared/styles/theme";
import env from "~/env";
import PageTheme from "./PageTheme";

afterEach(() => cleanup());

it("updates page classes and synchronous print colors without writing preference", () => {
  env.WEBSITE_INTEGRATION_ENABLED = true;
  let handleChange: (event: { matches: boolean }) => void = () => {};
  const remove = vi.fn();
  window.matchMedia = vi.fn().mockReturnValue({
    matches: false,
    addEventListener: (_event: string, handler: typeof handleChange) => {
      handleChange = handler;
    },
    removeEventListener: remove,
  });
  const write = vi.spyOn(global.localStorage, "setItem");
  document.head.innerHTML =
    '<meta name="theme-color"><meta name="color-scheme">';
  const view = render(
    <ThemeProvider theme={buildDarkTheme()}>
      <PageTheme />
    </ThemeProvider>
  );
  expect(document.documentElement.classList.contains("dark")).toBe(true);
  act(() => handleChange({ matches: true }));
  expect(document.documentElement.classList.contains("light")).toBe(true);
  expect(
    document.querySelector('meta[name="theme-color"]')?.getAttribute("content")
  ).toBe(light.background);
  act(() => handleChange({ matches: false }));
  expect(document.documentElement.classList.contains("dark")).toBe(true);
  expect(write).not.toHaveBeenCalled();
  view.unmount();
  expect(remove).toHaveBeenCalled();
  write.mockRestore();
});
