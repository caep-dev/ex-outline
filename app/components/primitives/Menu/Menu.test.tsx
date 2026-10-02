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
  it("binds the resting item to the menu item recipe", () => {
    const { getByRole } = renderWithTheme(
      <StyledMenuButton>Documents</StyledMenuButton>
    );

    expect(getByRole("button", { name: "Documents" })).toHaveStyle(
      `color: ${light.exui.components.menu.item.default.foreground}`
    );
    expect(getByRole("button", { name: "Documents" })).toHaveStyle(
      `border-radius: ${light.exui.components.menu.item.radius}`
    );
  });

  it("binds the highlighted item to the hover tokens", () => {
    const { getByRole } = renderWithTheme(
      <StyledMenuButton data-highlighted="">Documents</StyledMenuButton>
    );

    expect(getByRole("button", { name: "Documents" })).toHaveStyle(
      `background: ${light.exui.components.menu.item.hover.background}`
    );
    expect(getByRole("button", { name: "Documents" })).toHaveStyle(
      `color: ${light.exui.components.menu.item.hover.foreground}`
    );
  });

  it("binds the selected item to the selected tokens", () => {
    const { getByRole } = renderWithTheme(
      <StyledMenuButton $active>Documents</StyledMenuButton>
    );

    expect(getByRole("button", { name: "Documents" })).toHaveStyle(
      `background: ${light.exui.components.menu.checkedItem.background}`
    );
  });

  it("keeps selected chrome when the selected item is highlighted", () => {
    const { getByRole } = renderWithTheme(
      <StyledMenuButton $active data-highlighted="">
        Documents
      </StyledMenuButton>
    );

    expect(getByRole("button", { name: "Documents" })).toHaveStyle(
      `background: ${light.exui.components.menu.checkedItem.background}`
    );
    expect(getByRole("button", { name: "Documents" })).toHaveStyle(
      `color: ${light.exui.components.menu.checkedItem.foreground}`
    );
  });

  it("keeps destructive chrome above selected and highlighted states", () => {
    const { getByRole } = renderWithTheme(
      <StyledMenuButton $active $dangerous data-highlighted="">
        Delete
      </StyledMenuButton>
    );

    expect(getByRole("button", { name: "Delete" })).toHaveStyle(
      `background: ${light.exui.components.menu.item.destructive.background}`
    );
    expect(getByRole("button", { name: "Delete" })).toHaveStyle(
      `color: ${light.exui.components.menu.item.destructive.foreground}`
    );
  });

  it("binds the dangerous item to the danger tokens when highlighted", () => {
    const { getByRole } = renderWithTheme(
      <StyledMenuButton $dangerous data-highlighted="">
        Delete
      </StyledMenuButton>
    );

    expect(getByRole("button", { name: "Delete" })).toHaveStyle(
      `color: ${light.exui.components.menu.item.destructive.foreground}`
    );
    expect(getByRole("button", { name: "Delete" })).toHaveStyle(
      `background: ${light.exui.components.menu.item.destructive.background}`
    );
  });

  it("binds the disabled item to the disabled foreground token", () => {
    const { getByRole } = renderWithTheme(
      <StyledMenuButton disabled>Documents</StyledMenuButton>
    );

    expect(getByRole("button", { name: "Documents" })).toBeDisabled();
    expect(getByRole("button", { name: "Documents" })).toHaveStyle(
      `color: ${light.exui.components.menu.item.disabled.foreground}`
    );
  });

  it("binds the separator to the separator token", () => {
    const { container } = renderWithTheme(<StyledMenuSeparator />);
    const separator = container.firstElementChild as HTMLElement;

    expect(separator).toHaveStyle(
      `background: ${light.exui.components.menu.separator.color}`
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

  it("indicates selection with a checkmark without a selected background", async () => {
    const { getByRole } = renderWithTheme(
      <Menu open onOpenChange={vi.fn()}>
        <MenuTrigger asChild>
          <button>Open menu</button>
        </MenuTrigger>
        <MenuContent>
          <MenuButton label="Pinned" selected onClick={vi.fn()} />
        </MenuContent>
      </Menu>
    );

    const item = await waitFor(() => getByRole("menuitem", { name: "Pinned" }));
    expect(item).toHaveStyle(
      `background: ${light.exui.components.menu.item.default.background}`
    );
    expect(item.querySelector("svg")).toBeInTheDocument();
    expect(item).toHaveStyle(
      `color: ${light.exui.components.menu.item.default.foreground}`
    );
  });

  it("keeps hover feedback on a selected menu item", async () => {
    const { getByRole } = renderWithTheme(
      <Menu open onOpenChange={vi.fn()}>
        <MenuTrigger asChild>
          <button>Open menu</button>
        </MenuTrigger>
        <MenuContent>
          <MenuButton
            label="Pinned"
            selected
            data-highlighted=""
            onClick={vi.fn()}
          />
        </MenuContent>
      </Menu>
    );

    const item = await waitFor(() => getByRole("menuitem", { name: "Pinned" }));
    expect(item).toHaveStyle(
      `background: ${light.exui.components.menu.item.hover.background}`
    );
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
