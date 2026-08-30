import { fireEvent } from "@testing-library/react";
import { CloseIcon } from "outline-icons";
import { light } from "@shared/styles/theme";
import SidebarLink from "./SidebarLink";
import { renderWithTheme } from "~/test/renderWithTheme";

describe("SidebarLink", () => {
  it("uses the rounded-rectangle sidebar item recipe", () => {
    const { getByRole } = renderWithTheme(<SidebarLink label="Documents" />);
    const item = getByRole("button", { name: "Documents" });

    expect(item).toHaveStyle(
      `min-height: ${light.exui.components.sidebarItem.default.minHeight}`
    );
    expect(item).toHaveStyle(
      `border-radius: ${light.exui.components.sidebarItem.default.radius}`
    );
    expect(light.exui.components.sidebarItem.default.radius).not.toBe(
      light.exui.radii.full
    );
  });

  it("uses recipe inset and icon geometry without legacy compensation", () => {
    const { getByRole } = renderWithTheme(
      <SidebarLink icon={<CloseIcon />} label="Documents" />
    );
    const item = getByRole("button", { name: "Documents" });
    const icon = item.querySelector("svg")?.parentElement;

    expect(item).toHaveStyle(
      `padding-inline-start: calc(0px + ${light.exui.components.sidebarItem.default.paddingInline})`
    );
    expect(icon).toHaveStyle(
      `width: ${light.exui.components.sidebarItem.default.iconSize}`
    );
  });

  it("uses the active recipe without changing click behavior", () => {
    const handleClick = vi.fn();
    const { getByRole } = renderWithTheme(
      <SidebarLink active label="Documents" onClick={handleClick} />
    );
    const item = getByRole("button", { name: "Documents" });

    expect(item).toHaveStyle(
      `background: ${light.exui.components.sidebarItem.active.background}`
    );
    fireEvent.click(item);
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it("keeps disabled items non-interactive", () => {
    const handleClick = vi.fn();
    const { getByRole } = renderWithTheme(
      <SidebarLink disabled label="Documents" onClick={handleClick} />
    );

    fireEvent.click(getByRole("button", { name: "Documents" }));
    expect(handleClick).not.toHaveBeenCalled();
  });
});
