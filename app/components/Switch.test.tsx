import { fireEvent } from "@testing-library/react";
import { light } from "@shared/styles/theme";
import Switch from "~/components/Switch";
import { renderWithTheme } from "~/test/renderWithTheme";

describe("Switch", () => {
  it("binds the unchecked track to the tertiary surface token", () => {
    const { getByRole } = renderWithTheme(<Switch aria-label="Enable" />);

    expect(getByRole("switch", { name: "Enable" })).toHaveStyle(
      `background-color: ${light.exui.surface.surfaceTertiary}`
    );
  });

  it("binds the checked track to the primary control token", () => {
    const { getByRole } = renderWithTheme(
      <Switch aria-label="Enable" checked />
    );

    expect(getByRole("switch", { name: "Enable" })).toHaveStyle(
      `background-color: ${light.exui.control.primary}`
    );
  });

  it("toggles the checked state on click", () => {
    const onChange = vi.fn();
    const { getByRole } = renderWithTheme(
      <Switch aria-label="Enable" onChange={onChange} />
    );

    fireEvent.click(getByRole("switch", { name: "Enable" }));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("binds the disabled state to the disabled control token", () => {
    const onChange = vi.fn();
    const { getByRole } = renderWithTheme(
      <Switch aria-label="Enable" disabled onChange={onChange} />
    );
    const switchControl = getByRole("switch", { name: "Enable" });

    expect(switchControl).toBeDisabled();
    expect(switchControl).toHaveStyle(
      `background-color: ${light.exui.control.disabled}`
    );

    fireEvent.click(switchControl);
    expect(onChange).not.toHaveBeenCalled();
  });
});
