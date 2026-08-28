import { fireEvent } from "@testing-library/react";
import { light } from "@shared/styles/theme";
import { SelectionCheckbox } from "~/components/SelectionCheckbox";
import { renderWithTheme } from "~/test/renderWithTheme";

describe("SelectionCheckbox", () => {
  it("binds the unchecked state to the input border token", () => {
    const onClick = vi.fn();
    const { getByRole } = renderWithTheme(
      <SelectionCheckbox checked={false} label="Select" onClick={onClick} />
    );

    expect(getByRole("checkbox", { name: "Select" })).toHaveAttribute(
      "aria-checked",
      "false"
    );
    expect(getByRole("checkbox", { name: "Select" })).toHaveStyle(
      `border: 2px solid ${light.exui.surface.borderInput}`
    );
  });

  it("binds the checked state to the primary control token", () => {
    const onClick = vi.fn();
    const { getByRole } = renderWithTheme(
      <SelectionCheckbox checked label="Select" onClick={onClick} />
    );
    const checkbox = getByRole("checkbox", { name: "Select" });

    expect(checkbox).toHaveAttribute("aria-checked", "true");
    expect(checkbox).toHaveStyle(`background: ${light.exui.control.primary}`);
    expect(checkbox).toHaveStyle(
      `color: ${light.exui.control.primaryForeground}`
    );
  });

  it("exposes the mixed state for indeterminate selection", () => {
    const onClick = vi.fn();
    const { getByRole } = renderWithTheme(
      <SelectionCheckbox
        checked={false}
        indeterminate
        label="Select"
        onClick={onClick}
      />
    );

    expect(getByRole("checkbox", { name: "Select" })).toHaveAttribute(
      "aria-checked",
      "mixed"
    );
  });

  it("propagates clicks", () => {
    const onClick = vi.fn();
    const { getByRole } = renderWithTheme(
      <SelectionCheckbox checked label="Select" onClick={onClick} />
    );

    fireEvent.click(getByRole("checkbox", { name: "Select" }));
    expect(onClick).toHaveBeenCalled();
  });
});
