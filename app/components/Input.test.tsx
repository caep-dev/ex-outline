import { fireEvent } from "@testing-library/react";
import { CloseIcon } from "outline-icons";
import { light } from "@shared/styles/theme";
import Input from "~/components/Input";
import { renderWithTheme, toRgb } from "~/test/renderWithTheme";

describe("Input", () => {
  it("binds the default control to the form-control recipe", () => {
    const { getByRole } = renderWithTheme(
      <Input label="Name" placeholder="Enter name" />
    );
    const input = getByRole("textbox", { name: "Name" });
    const outline = input.parentElement as HTMLElement;

    expect(outline).toHaveStyle(
      `border-top-color: ${toRgb(light.exui.components.formControl.base.border)}`
    );
    expect(input).toHaveStyle(
      `color: ${light.exui.components.formControl.base.foreground}`
    );
    expect(outline).toHaveStyle(
      `background: ${light.exui.components.formControl.base.background}`
    );
  });

  it("switches to the focused border and shadow on focus", () => {
    const { getByRole } = renderWithTheme(<Input label="Name" />);
    const input = getByRole("textbox", { name: "Name" });
    const outline = input.parentElement as HTMLElement;

    fireEvent.focus(input);
    expect(light.exui.components.formControl.focus.border).toBe("transparent");
    expect(outline).toHaveStyle("border-top-color: rgba(0, 0, 0, 0)");
    expect(getComputedStyle(outline).boxShadow.replace(/\s/g, "")).toBe(
      light.exui.components.formControl.focus.shadow.replace(/\s/g, "")
    );

    fireEvent.blur(input);
    expect(outline).toHaveStyle(
      `border-top-color: ${toRgb(light.exui.components.formControl.base.border)}`
    );
  });

  it("binds the error state to the invalid control token and shows the message", () => {
    const { getByRole, getByText } = renderWithTheme(
      <Input label="Name" error="Name is required" />
    );
    const input = getByRole("textbox", { name: "Name" });
    const outline = input.parentElement as HTMLElement;

    expect(light.exui.components.formControl.invalid.border).toBe(
      "transparent"
    );
    expect(outline).toHaveStyle("border-top-color: rgba(0, 0, 0, 0)");
    expect(getComputedStyle(outline).boxShadow.replace(/\s/g, "")).toBe(
      light.exui.components.formControl.invalid.shadow.replace(/\s/g, "")
    );
    expect(getByText("Name is required")).toBeInTheDocument();
  });

  it("binds the disabled state to the form-control recipe", () => {
    const { getByRole } = renderWithTheme(
      <Input label="Name" disabled placeholder="Enter name" />
    );
    const input = getByRole("textbox", { name: "Name" });

    expect(input).toBeDisabled();
    expect(input).toHaveStyle(
      `color: ${light.exui.components.formControl.disabled.foreground}`
    );
  });

  it("uses the form-control geometry", () => {
    const { getByRole } = renderWithTheme(<Input label="Name" />);
    const input = getByRole("textbox", { name: "Name" });
    const outline = input.parentElement as HTMLElement;

    expect(input).toHaveStyle(
      `height: ${light.exui.components.formControl.base.height}`
    );
    expect(outline).toHaveStyle(
      `border-radius: ${light.exui.components.formControl.base.radius}`
    );
  });

  it("keeps recipe padding before leading content", () => {
    const { getByRole } = renderWithTheme(
      <Input label="Search" icon={<CloseIcon />} />
    );
    const input = getByRole("textbox", { name: "Search" });
    const outline = input.parentElement as HTMLElement;

    expect(outline).toHaveStyle(
      `padding-inline-start: ${light.exui.components.formControl.base.paddingInline}`
    );
    expect(input).toHaveStyle("padding-inline-start: 0");
  });

  it("falls back to the placeholder as an accessible name when unlabeled", () => {
    const { getByRole } = renderWithTheme(<Input placeholder="Search" />);

    expect(getByRole("textbox", { name: "Search" })).toBeInTheDocument();
  });
});
