// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Logout from "./Logout";

const mocks = vi.hoisted(() => ({ logout: vi.fn() }));
vi.mock("~/hooks/useStores", () => ({
  default: () => ({
    auth: { websiteIntegrationEnabled: true, logout: mocks.logout },
  }),
}));
vi.mock("~/components/Button", () => ({
  default: ({
    children,
    onClick,
  }: {
    children: string;
    onClick: () => void;
  }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (value: string) => value }),
}));

afterEach(() => {
  cleanup();
  mocks.logout.mockReset();
});

describe("integrated sign-out page", () => {
  it("keeps a failed server revocation visible and allows retry", async () => {
    mocks.logout
      .mockRejectedValueOnce(new Error("503"))
      .mockResolvedValueOnce(undefined);
    render(<Logout />);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Unable to sign out"
    );
    expect(mocks.logout).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(mocks.logout).toHaveBeenCalledTimes(2));
  });
});
