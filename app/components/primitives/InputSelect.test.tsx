import { fireEvent, waitFor } from "@testing-library/react";
import { light } from "@shared/styles/theme";
import {
  InputSelectContent,
  InputSelectItem,
  InputSelectRoot,
  InputSelectTrigger,
} from "~/components/primitives/InputSelect";
import { renderWithTheme } from "~/test/renderWithTheme";

describe("InputSelect", () => {
  it("binds the trigger to the standard control metrics", () => {
    const { getByRole } = renderWithTheme(
      <InputSelectRoot open onOpenChange={vi.fn()}>
        <InputSelectTrigger placeholder="Choose one" />
      </InputSelectRoot>
    );

    expect(getByRole("combobox")).toHaveStyle(
      `height: ${light.exui.density.standard.controlHeight}`
    );
  });

  it("shows the placeholder color when no value is selected", () => {
    const { getByRole } = renderWithTheme(
      <InputSelectRoot open onOpenChange={vi.fn()}>
        <InputSelectTrigger placeholder="Choose one" />
      </InputSelectRoot>
    );

    expect(getByRole("combobox")).toHaveStyle(
      `color: ${light.exui.surface.placeholder}`
    );
  });

  it("binds the open content to the menu overlay tokens", async () => {
    const { getByRole } = renderWithTheme(
      <InputSelectRoot open onOpenChange={vi.fn()}>
        <InputSelectTrigger placeholder="Choose one" />
        <InputSelectContent>
          <InputSelectItem value="one">One</InputSelectItem>
        </InputSelectContent>
      </InputSelectRoot>
    );

    const option = await waitFor(() => getByRole("option", { name: "One" }));
    const content = option.closest("[role='listbox']") as HTMLElement;

    expect(content).toHaveStyle(
      `background: ${light.exui.overlay.menu.background}`
    );
    expect(option).toHaveStyle(`color: ${light.exui.overlay.menu.foreground}`);
  });

  it("selects an item on click and notifies the caller", async () => {
    const onValueChange = vi.fn();
    const { getByRole } = renderWithTheme(
      <InputSelectRoot open onValueChange={onValueChange}>
        <InputSelectTrigger placeholder="Choose one" />
        <InputSelectContent>
          <InputSelectItem value="one">One</InputSelectItem>
          <InputSelectItem value="two">Two</InputSelectItem>
        </InputSelectContent>
      </InputSelectRoot>
    );

    const option = await waitFor(() => getByRole("option", { name: "Two" }));
    fireEvent.click(option);
    expect(onValueChange).toHaveBeenCalledWith("two");
  });
});
