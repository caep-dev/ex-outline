import { fireEvent } from "@testing-library/react";
import { light } from "@shared/styles/theme";
import { MoreIcon } from "@shared/components/LucideIcon";
import ActionButton from "~/components/ActionButton";
import Button from "~/components/Button";
import ButtonLarge from "~/components/ButtonLarge";
import ButtonSmall from "~/components/ButtonSmall";
import NudeButton from "~/components/NudeButton";
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
  it("binds the primary variant to the primary button recipe", () => {
    const { getByRole } = renderWithTheme(<Button>Save</Button>);
    const button = getByRole("button", { name: "Save" });

    expect(button).toHaveStyle(
      `background: ${light.exui.components.button.primary.default.background}`
    );
    expect(button).toHaveStyle(
      `color: ${light.exui.components.button.primary.default.foreground}`
    );
    expect(button).toHaveStyle(
      `height: ${light.exui.components.button.default.height}`
    );
    expect(button).toHaveStyle(
      `border-radius: ${light.exui.components.button.default.radius}`
    );
  });

  it("binds the hover and disabled states to the derived primary tokens", () => {
    renderWithTheme(<Button>Save</Button>);
    const css = normalize(getInjectedCss());

    expect(css).toContain(
      normalize(light.exui.components.button.primary.hover.background)
    );
    expect(css).toContain(
      normalize(light.exui.components.button.primary.disabled.background)
    );
  });

  it("binds the neutral variant to the neutral control tokens", () => {
    const { getByRole } = renderWithTheme(<Button neutral>Cancel</Button>);

    expect(getByRole("button", { name: "Cancel" })).toHaveStyle(
      `color: ${light.exui.components.button.outline.default.foreground}`
    );
  });

  it("binds the danger variant to the danger control tokens", () => {
    const { getByRole } = renderWithTheme(<Button danger>Delete</Button>);
    const button = getByRole("button", { name: "Delete" });

    expect(button).toHaveStyle(
      `background: ${light.exui.components.button.danger.default.background}`
    );
    expect(button).toHaveStyle(
      `color: ${light.exui.components.button.danger.default.foreground}`
    );
  });

  it("renders an icon-only button as a recipe-sized circle", () => {
    const { getByRole } = renderWithTheme(
      <Button icon={<svg aria-hidden />} aria-label="Add" />
    );
    const button = getByRole("button", { name: "Add" });

    expect(button).toHaveStyle(
      `width: ${light.exui.components.button.icon.height}`
    );
    expect(button).toHaveStyle(
      `height: ${light.exui.components.button.default.height}`
    );
    expect(button).toHaveStyle(
      `border-radius: ${light.exui.components.button.icon.radius}`
    );
    expect(button.firstElementChild).toHaveStyle("width: 100%");
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
  it("uses the large button recipe", () => {
    const { getByRole } = renderWithTheme(<ButtonLarge>Continue</ButtonLarge>);

    expect(getByRole("button", { name: "Continue" })).toHaveStyle(
      `height: ${light.exui.components.button.large.height}`
    );
  });

  it("uses the small button recipe", () => {
    const { getByRole } = renderWithTheme(<ButtonSmall>Close</ButtonSmall>);

    expect(getByRole("button", { name: "Close" })).toHaveStyle(
      `height: ${light.exui.components.button.small.height}`
    );
  });
});

describe("NudeButton", () => {
  it("centers a standard-sized more icon while preserving the hit area", () => {
    const onClick = vi.fn();
    const { getByRole } = renderWithTheme(
      <NudeButton aria-label="More" size={32} onClick={onClick}>
        <MoreIcon size={24} />
      </NudeButton>
    );
    const button = getByRole("button", { name: "More" });

    expect(button).toHaveStyle(
      "display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px"
    );
    expect(button.querySelector("svg")).toHaveStyle(
      `width: ${light.exui.components.button.icon.iconSize}; height: ${light.exui.components.button.icon.iconSize}`
    );
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });
});
