import { fireEvent, waitFor } from "@testing-library/react";
import { light } from "@shared/styles/theme";
import Modal from "~/components/Modal";
import { renderWithTheme } from "~/test/renderWithTheme";

vi.mock("~/hooks/useMobile", () => ({
  default: () => false,
}));

describe("Modal", () => {
  it("binds the dialog surface to the dialog overlay tokens", () => {
    const { getByRole } = renderWithTheme(
      <Modal isOpen title="Settings" onRequestClose={vi.fn()}>
        Content
      </Modal>
    );
    const dialog = getByRole("dialog", { name: "Settings" });
    const surface = dialog.firstElementChild as HTMLElement;

    expect(dialog).toBeInTheDocument();
    expect(surface).toHaveStyle(
      `background: ${light.exui.overlay.dialog.background}`
    );
    expect(surface).toHaveStyle(
      `border-radius: ${light.exui.overlay.dialog.radius}`
    );
  });

  it("closes via the close button and notifies the caller", async () => {
    const onRequestClose = vi.fn();
    const { getByRole } = renderWithTheme(
      <Modal isOpen title="Settings" onRequestClose={onRequestClose}>
        Content
      </Modal>
    );

    fireEvent.click(getByRole("button", { name: "Close" }));
    await waitFor(() => expect(onRequestClose).toHaveBeenCalled());
  });

  it("moves focus into the dialog when opened", async () => {
    const { getByRole } = renderWithTheme(
      <Modal isOpen title="Settings" onRequestClose={vi.fn()}>
        Content
      </Modal>
    );

    const dialog = getByRole("dialog", { name: "Settings" });
    await waitFor(() =>
      expect(dialog.contains(document.activeElement)).toBe(true)
    );
  });

  it("renders nothing when closed for the first time", () => {
    const { queryByRole } = renderWithTheme(
      <Modal isOpen={false} title="Settings" onRequestClose={vi.fn()}>
        Content
      </Modal>
    );

    expect(queryByRole("dialog")).not.toBeInTheDocument();
  });
});
