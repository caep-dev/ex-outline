import { fireEvent } from "@testing-library/react";
import { CloseIcon } from "outline-icons";
import { createMemoryHistory } from "history";
import * as Menu from "@radix-ui/react-dropdown-menu";
import { Router } from "react-router-dom";
import { light } from "@shared/styles/theme";
import EditableTitle from "~/components/EditableTitle";
import { OverflowMenuButton } from "~/components/Menu/OverflowMenuButton";
import SidebarLink from "./SidebarLink";
import { renderWithTheme } from "~/test/renderWithTheme";

describe("SidebarLink", () => {
  it("keeps an inline title focus ring outside the row clipping boundary", () => {
    const { getByRole } = renderWithTheme(
      <SidebarLink
        ellipsis={false}
        label={
          <EditableTitle title="" canUpdate isEditing onSubmit={vi.fn()} />
        }
      />
    );

    expect(getByRole("textbox").closest("button")).toHaveStyle(
      "overflow: visible"
    );
  });

  it.each(["pointer", "keyboard"])(
    "opens a nested menu with %s without activating the outer link's native navigation",
    async (input) => {
      const history = createMemoryHistory({ initialEntries: ["/current"] });
      const handleRename = vi.fn();
      const { getByRole, findByRole } = renderWithTheme(
        <Router history={history}>
          <SidebarLink
            to="/other-document"
            label="Other document"
            $showActions
            menu={
              <Menu.Root modal={false}>
                <Menu.Trigger asChild>
                  <OverflowMenuButton aria-label="Document options" />
                </Menu.Trigger>
                <Menu.Portal>
                  <Menu.Content>
                    <Menu.Item onSelect={handleRename}>Rename</Menu.Item>
                    <Menu.Item asChild>
                      <a href="#download">Download</a>
                    </Menu.Item>
                  </Menu.Content>
                </Menu.Portal>
              </Menu.Root>
            }
          />
        </Router>
      );
      const trigger = getByRole("button", { name: "Document options" });

      if (input === "pointer") {
        // jsdom's generic pointer event omits the button property Radix requires.
        fireEvent(
          trigger,
          new MouseEvent("pointerdown", {
            bubbles: true,
            button: 0,
            ctrlKey: false,
          })
        );
        fireEvent.mouseDown(trigger, { button: 0 });
        fireEvent.pointerUp(trigger, { button: 0 });
        fireEvent.mouseUp(trigger, { button: 0 });
      } else {
        fireEvent.keyDown(trigger, { key: "Enter" });
        fireEvent.keyUp(trigger, { key: "Enter" });
      }
      const uncanceled = fireEvent.click(trigger, { button: 0 });

      expect(uncanceled).toBe(false);
      expect(history.location.pathname).toBe("/current");
      fireEvent.click(await findByRole("menuitem", { name: "Rename" }));
      expect(handleRename).toHaveBeenCalledOnce();
      expect(history.location.pathname).toBe("/current");

      fireEvent.keyDown(trigger, { key: "Enter" });
      // Portaled menu links are outside the row and retain native activation.
      expect(
        fireEvent.click(await findByRole("menuitem", { name: "Download" }))
      ).toBe(true);
    }
  );

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
    expect(item).toHaveStyle("overflow: hidden");
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
