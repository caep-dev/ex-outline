import { render, cleanup } from "@testing-library/react";
import env from "~/env";
import { Theme } from "~/stores/UiStore";
import useBuildTheme from "./useBuildTheme";

const state = vi.hoisted(() => ({
  printing: false,
  mobile: true,
  ui: { resolvedTheme: "dark", setThemeOverride: vi.fn() },
}));
vi.mock("~/hooks/useStores", () => ({ default: () => ({ ui: state.ui }) }));
vi.mock("~/hooks/useQuery", () => ({
  default: () => new URLSearchParams("theme=light"),
}));
vi.mock("~/hooks/useMediaQuery", () => ({
  default: (query: string) =>
    query === "print" ? state.printing : state.mobile,
}));
vi.mock("~/utils/websiteThemePalette", () => ({
  readWebsiteThemePalette: () => undefined,
}));

function Surface({ override }: { override?: Theme }) {
  const theme = useBuildTheme(
    { accent: "#ff0000", accentText: "#00ff00" },
    override
  );
  return <output data-mode={theme.exui.mode} data-accent={theme.accent} />;
}
afterEach(() => cleanup());

it("uses standard integrated dark on phones, ignores workspace branding and prints locally", () => {
  env.WEBSITE_INTEGRATION_ENABLED = true;
  state.printing = false;
  const view = render(<Surface />);
  const output = view.container.querySelector("output");
  expect(output?.getAttribute("data-mode")).toBe("dark");
  expect(output?.getAttribute("data-accent")).not.toBe("#ff0000");
  state.printing = true;
  view.rerender(<Surface />);
  expect(output?.getAttribute("data-mode")).toBe("light");
  state.printing = false;
  view.rerender(<Surface override={Theme.Light} />);
  expect(output?.getAttribute("data-mode")).toBe("light");
});

it("retains standalone phone pitchBlack, workspace branding and query override", () => {
  env.WEBSITE_INTEGRATION_ENABLED = false;
  state.printing = false;
  state.ui.setThemeOverride.mockClear();
  const view = render(<Surface />);
  expect(
    view.container.querySelector("output")?.getAttribute("data-mode")
  ).toBe("pitchBlack");
  expect(
    view.container.querySelector("output")?.getAttribute("data-accent")
  ).toBe("#ff0000");
  expect(state.ui.setThemeOverride).toHaveBeenCalledWith(Theme.Light);
});
