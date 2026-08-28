import { fireEvent } from "@testing-library/react";
import { light } from "@shared/styles/theme";
import Input from "~/components/Input";
import { renderWithTheme, toRgb } from "~/test/renderWithTheme";

describe("Input", () => {
  it("binds the default border to the input border token", () => {
    const { getByRole } = renderWithTheme(
      <Input label="Name" placeholder="Enter name" />
    );
    const input = getByRole("textbox", { name: "Name" });
    const outline = input.parentElement as HTMLElement;

    expect(outline).toHaveStyle(
      `border-top-color: ${toRgb(light.exui.surface.borderInput)}`
    );
    expect(input).toHaveStyle(`color: ${light.exui.surface.foreground}`);
  });

  it("switches to the focused border token on focus", () => {
    const { getByRole } = renderWithTheme(<Input label="Name" />);
    const input = getByRole("textbox", { name: "Name" });
    const outline = input.parentElement as HTMLElement;

    fireEvent.focus(input);
    expect(outline).toHaveStyle(
      `border-top-color: ${toRgb(light.exui.surface.borderFocused)}`
    );

    fireEvent.blur(input);
    expect(outline).toHaveStyle(
      `border-top-color: ${toRgb(light.exui.surface.borderInput)}`
    );
  });

  it("binds the error state to the invalid control token and shows the message", () => {
    const { getByRole, getByText } = renderWithTheme(
      <Input label="Name" error="Name is required" />
    );
    const input = getByRole("textbox", { name: "Name" });
    const outline = input.parentElement as HTMLElement;

    expect(outline).toHaveStyle(
      `border-top-color: ${toRgb(light.exui.control.invalid)}`
    );
    expect(getByText("Name is required")).toBeInTheDocument();
  });

  it("binds the disabled and placeholder colors to the placeholder token", () => {
    const { getByRole } = renderWithTheme(
      <Input label="Name" disabled placeholder="Enter name" />
    );
    const input = getByRole("textbox", { name: "Name" });

    expect(input).toBeDisabled();
    expect(input).toHaveStyle(`color: ${light.exui.surface.placeholder}`);
  });

  it("uses the standard control height and radius metrics", () => {
    const { getByRole } = renderWithTheme(<Input label="Name" />);
    const input = getByRole("textbox", { name: "Name" });
    const outline = input.parentElement as HTMLElement;

    expect(input).toHaveStyle(
      `height: ${light.exui.density.standard.controlHeight}`
    );
    expect(outline).toHaveStyle(
      `border-radius: ${light.exui.density.standard.controlRadius}`
    );
  });

  it("falls back to the placeholder as an accessible name when unlabeled", () => {
    const { getByRole } = renderWithTheme(<Input placeholder="Search" />);

    expect(getByRole("textbox", { name: "Search" })).toBeInTheDocument();
  });
});
