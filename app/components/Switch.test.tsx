import { fireEvent } from "@testing-library/react";
import { light } from "@shared/styles/theme";
import Switch from "~/components/Switch";
import { renderWithTheme } from "~/test/renderWithTheme";

describe("Switch", () => {
  it("binds the unchecked track to the input surface token", () => {
    const { getByRole } = renderWithTheme(<Switch aria-label="Enable" />);

    expect(getByRole("switch", { name: "Enable" })).toHaveStyle(
      `background-color: ${light.inputBackground}`
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

  it("dims the disabled state and prevents interaction", () => {
    const onChange = vi.fn();
    const { getByRole } = renderWithTheme(
      <Switch aria-label="Enable" disabled onChange={onChange} />
    );
    const switchControl = getByRole("switch", { name: "Enable" });

    expect(switchControl).toBeDisabled();
    expect(switchControl).toHaveStyle("opacity: 0.5");

    fireEvent.click(switchControl);
    expect(onChange).not.toHaveBeenCalled();
  });
});
