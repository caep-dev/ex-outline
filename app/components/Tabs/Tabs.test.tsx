import { fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { light } from "@shared/styles/theme";
import { Tabs, Separator } from "~/components/Tabs/Tabs";
import { Tab } from "~/components/Tabs/Tab";
import { renderWithTheme } from "~/test/renderWithTheme";

vi.mock("~/hooks/useWindowSize", () => ({
  default: () => ({ width: 1024 }),
}));

describe("Tab button mode", () => {
  it("binds the active tab to the tab active foreground token", () => {
    const onClick = vi.fn();
    const { getByRole } = renderWithTheme(
      <Tab active onClick={onClick}>
        Documents
      </Tab>
    );

    expect(getByRole("button", { name: "Documents" })).toHaveStyle(
      `color: ${light.exui.overlay.tab.foregroundActive}`
    );
  });

  it("binds the inactive tab to the tab foreground token", () => {
    const onClick = vi.fn();
    const { getByRole } = renderWithTheme(
      <Tab active={false} onClick={onClick}>
        Documents
      </Tab>
    );

    expect(getByRole("button", { name: "Documents" })).toHaveStyle(
      `color: ${light.exui.overlay.tab.foreground}`
    );
  });

  it("shows the indicator for the active tab", () => {
    const onClick = vi.fn();
    const { getByRole } = renderWithTheme(
      <Tab active onClick={onClick}>
        Documents
      </Tab>
    );

    expect(
      getByRole("button", { name: "Documents" }).firstElementChild
    ).toHaveStyle(`background: ${light.exui.overlay.tab.indicator}`);
  });

  it("hides the indicator for the inactive tab", () => {
    const onClick = vi.fn();
    const { getByRole } = renderWithTheme(
      <Tab active={false} onClick={onClick}>
        Documents
      </Tab>
    );

    expect(
      getByRole("button", { name: "Documents" }).firstElementChild
    ).toBeNull();
  });

  it("propagates clicks", () => {
    const onClick = vi.fn();
    const { getByRole } = renderWithTheme(
      <Tab active={false} onClick={onClick}>
        Documents
      </Tab>
    );

    fireEvent.click(getByRole("button", { name: "Documents" }));
    expect(onClick).toHaveBeenCalled();
  });
});

describe("Tab link mode", () => {
  it("matches the same active foreground token when the route is active", () => {
    const { getByRole } = renderWithTheme(
      <MemoryRouter initialEntries={["/settings"]}>
        <Tab to="/settings">Settings</Tab>
      </MemoryRouter>
    );

    expect(getByRole("link", { name: "Settings" })).toHaveStyle(
      `color: ${light.exui.overlay.tab.foregroundActive}`
    );
  });

  it("uses the foreground token when the route is not active", () => {
    const { getByRole } = renderWithTheme(
      <MemoryRouter initialEntries={["/documents"]}>
        <Tab to="/settings">Settings</Tab>
      </MemoryRouter>
    );

    expect(getByRole("link", { name: "Settings" })).toHaveStyle(
      `color: ${light.exui.overlay.tab.foreground}`
    );
  });
});

describe("Tabs", () => {
  it("binds the divider and sticky surface to the surface tokens", () => {
    const { container } = renderWithTheme(
      <Tabs>
        <Tab active onClick={vi.fn()}>
          Documents
        </Tab>
      </Tabs>
    );
    const nav = container.querySelector("nav") as HTMLElement;

    expect(nav).toHaveStyle(
      `border-bottom: 1px solid ${light.exui.surface.divider}`
    );
    expect(nav.parentElement).toHaveStyle(
      `background: ${light.exui.surface.background}`
    );
  });

  it("binds the separator divider to the divider token", () => {
    const { container } = renderWithTheme(<Separator />);
    const separator = container.firstElementChild as HTMLElement;

    expect(separator).toHaveStyle(
      `border-left: 1px solid ${light.exui.surface.divider}`
    );
  });
});
