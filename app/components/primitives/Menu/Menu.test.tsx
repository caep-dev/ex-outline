import { fireEvent, waitFor } from "@testing-library/react";
import { light } from "@shared/styles/theme";
import {
  MenuButton as StyledMenuButton,
  MenuSeparator as StyledMenuSeparator,
} from "~/components/primitives/components/Menu";
import {
  Menu,
  MenuButton,
  MenuContent,
  MenuTrigger,
} from "~/components/primitives/Menu";
import { renderWithTheme } from "~/test/renderWithTheme";

describe("menu item visual tokens", () => {
  it("binds the resting item to the menu foreground token", () => {
    const { getByRole } = renderWithTheme(
      <StyledMenuButton>Documents</StyledMenuButton>
    );

    expect(getByRole("button", { name: "Documents" })).toHaveStyle(
      `color: ${light.exui.overlay.menu.foreground}`
    );
  });

  it("binds the highlighted item to the hover tokens", () => {
    const { getByRole } = renderWithTheme(
      <StyledMenuButton data-highlighted="">Documents</StyledMenuButton>
    );

    expect(getByRole("button", { name: "Documents" })).toHaveStyle(
      `background: ${light.exui.overlay.menu.itemBackgroundHover}`
    );
    expect(getByRole("button", { name: "Documents" })).toHaveStyle(
      `color: ${light.exui.overlay.menu.itemForegroundHover}`
    );
  });

  it("binds the selected item to the selected tokens", () => {
    const { getByRole } = renderWithTheme(
      <StyledMenuButton $active>Documents</StyledMenuButton>
    );

    expect(getByRole("button", { name: "Documents" })).toHaveStyle(
      `background: ${light.exui.overlay.menu.itemBackgroundSelected}`
    );
  });

  it("binds the dangerous item to the danger tokens when highlighted", () => {
    const { getByRole } = renderWithTheme(
      <StyledMenuButton $dangerous data-highlighted="">
        Delete
      </StyledMenuButton>
    );

    expect(getByRole("button", { name: "Delete" })).toHaveStyle(
      `color: ${light.exui.overlay.menu.itemForegroundDanger}`
    );
    expect(getByRole("button", { name: "Delete" })).toHaveStyle(
      `background: ${light.exui.overlay.menu.itemBackgroundDanger}`
    );
  });

  it("binds the disabled item to the disabled foreground token", () => {
    const { getByRole } = renderWithTheme(
      <StyledMenuButton disabled>Documents</StyledMenuButton>
    );

    expect(getByRole("button", { name: "Documents" })).toBeDisabled();
    expect(getByRole("button", { name: "Documents" })).toHaveStyle(
      `color: ${light.exui.overlay.menu.foregroundDisabled}`
    );
  });

  it("binds the separator to the separator token", () => {
    const { container } = renderWithTheme(<StyledMenuSeparator />);
    const separator = container.firstElementChild as HTMLElement;

    expect(separator).toHaveStyle(
      `background: ${light.exui.overlay.menu.separator}`
    );
  });
});

describe("menu interaction", () => {
  it("opens the menu and selects an item on click", async () => {
    const onClick = vi.fn();
    const { getByRole } = renderWithTheme(
      <Menu open onOpenChange={vi.fn()}>
        <MenuTrigger asChild>
          <button>Open menu</button>
        </MenuTrigger>
        <MenuContent>
          <MenuButton label="Documents" onClick={onClick} />
        </MenuContent>
      </Menu>
    );

    const item = await waitFor(() =>
      getByRole("menuitem", { name: "Documents" })
    );
    fireEvent.click(item);
    expect(onClick).toHaveBeenCalled();
  });

  it("keeps disabled items non-selectable", async () => {
    const onClick = vi.fn();
    const { getByRole } = renderWithTheme(
      <Menu open onOpenChange={vi.fn()}>
        <MenuTrigger asChild>
          <button>Open menu</button>
        </MenuTrigger>
        <MenuContent>
          <MenuButton label="Documents" disabled onClick={onClick} />
        </MenuContent>
      </Menu>
    );

    const item = await waitFor(() =>
      getByRole("menuitem", { name: "Documents" })
    );
    fireEvent.click(item);
    expect(onClick).not.toHaveBeenCalled();
  });
});
