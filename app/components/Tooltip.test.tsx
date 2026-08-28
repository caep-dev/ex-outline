import { light } from "@shared/styles/theme";
import Tooltip from "~/components/Tooltip";
import { renderWithTheme } from "~/test/renderWithTheme";

vi.mock("~/hooks/useMobile", () => ({
  default: () => false,
}));

describe("Tooltip", () => {
  it("renders the content bound to the tooltip overlay tokens when open", () => {
    const { getByRole } = renderWithTheme(
      <Tooltip content="Keyboard shortcut" open>
        <button>Trigger</button>
      </Tooltip>
    );
    const tooltip = getByRole("tooltip");

    expect(tooltip).toHaveTextContent("Keyboard shortcut");
    expect(tooltip).toHaveStyle(
      `background-color: ${light.exui.overlay.tooltip.background}`
    );
    expect(tooltip).toHaveStyle(
      `color: ${light.exui.overlay.tooltip.foreground}`
    );
    expect(tooltip).toHaveStyle(
      `border-radius: ${light.exui.overlay.tooltip.radius}`
    );
  });

  it("renders the keyboard shortcut as an accessible kbd element", () => {
    const { getByRole } = renderWithTheme(
      <Tooltip content="Open" shortcut="⌘K" open>
        <button>Trigger</button>
      </Tooltip>
    );

    expect(getByRole("tooltip")).toContainElement(
      document.querySelector("kbd") as HTMLElement
    );
  });

  it("renders nothing when content is missing", () => {
    const { queryByRole } = renderWithTheme(
      <Tooltip>
        <button>Trigger</button>
      </Tooltip>
    );

    expect(queryByRole("tooltip")).not.toBeInTheDocument();
  });

  it("keeps the trigger accessible name intact", () => {
    const { getByRole } = renderWithTheme(
      <Tooltip content="Help">
        <button>Trigger</button>
      </Tooltip>
    );

    expect(getByRole("button", { name: "Trigger" })).toBeInTheDocument();
  });
});
