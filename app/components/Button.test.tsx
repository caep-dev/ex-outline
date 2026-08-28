import { fireEvent } from "@testing-library/react";
import { light } from "@shared/styles/theme";
import ActionButton from "~/components/ActionButton";
import Button from "~/components/Button";
import ButtonLarge from "~/components/ButtonLarge";
import ButtonSmall from "~/components/ButtonSmall";
import { getInjectedCss, renderWithTheme } from "~/test/renderWithTheme";

describe("ActionButton", () => {
  it("renders a native button", () => {
    const { getByRole } = renderWithTheme(<ActionButton aria-label="Open" />);
    const button = getByRole("button", { name: "Open" });

    expect(button.tagName).toBe("BUTTON");
  });

  it("carries a stable data-slot for browser acceptance", () => {
    const { getByRole } = renderWithTheme(<ActionButton aria-label="Open" />);

    expect(getByRole("button", { name: "Open" })).toHaveAttribute(
      "data-slot",
      "action-button"
    );
  });
});

/**
 * Removes whitespace so theme token values can be compared against the CSS
 * text emitted by styled-components, which strips spaces.
 *
 * @param value the value to normalize.
 * @returns the value without whitespace.
 */
const normalize = (value: string) => value.replace(/\s+/g, "");

describe("Button", () => {
  it("binds the primary variant to the primary control token", () => {
    const { getByRole } = renderWithTheme(<Button>Save</Button>);
    const button = getByRole("button", { name: "Save" });

    expect(button).toHaveStyle(`background: ${light.exui.control.primary}`);
    expect(button).toHaveStyle(
      `color: ${light.exui.control.primaryForeground}`
    );
    expect(button).toHaveStyle(
      `height: ${light.exui.density.standard.controlHeight}`
    );
  });

  it("binds the hover and disabled states to the derived primary tokens", () => {
    renderWithTheme(<Button>Save</Button>);
    const css = normalize(getInjectedCss());

    expect(css).toContain(normalize(light.exui.control.primaryHover));
    expect(css).toContain(normalize(light.exui.control.primaryDisabled));
  });

  it("binds the neutral variant to the neutral control tokens", () => {
    const { getByRole } = renderWithTheme(<Button neutral>Cancel</Button>);

    expect(getByRole("button", { name: "Cancel" })).toHaveStyle(
      `color: ${light.exui.control.neutralForeground}`
    );
  });

  it("binds the danger variant to the danger control tokens", () => {
    const { getByRole } = renderWithTheme(<Button danger>Delete</Button>);
    const button = getByRole("button", { name: "Delete" });

    expect(button).toHaveStyle(`background: ${light.exui.control.danger}`);
    expect(button).toHaveStyle(`color: ${light.exui.control.dangerForeground}`);
  });

  it("disables pointer interaction when disabled", () => {
    const onClick = vi.fn();
    const { getByRole } = renderWithTheme(
      <Button disabled onClick={onClick}>
        Save
      </Button>
    );
    const button = getByRole("button", { name: "Save" });

    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe("ButtonLarge and ButtonSmall", () => {
  it("keeps the explicit large height while sourcing padding from the standard scale", () => {
    const { getByRole } = renderWithTheme(<ButtonLarge>Continue</ButtonLarge>);

    expect(getByRole("button", { name: "Continue" })).toHaveStyle(
      "height: 40px"
    );
  });

  it("uses the compact density metrics", () => {
    const { getByRole } = renderWithTheme(<ButtonSmall>Close</ButtonSmall>);

    expect(getByRole("button", { name: "Close" })).toHaveStyle(
      `height: ${light.exui.density.compact.controlHeight}`
    );
  });
});
