import type { ActionContext } from "~/types";
import { it, expect, vi } from "vitest";
import { logout } from "./navigation";
const mocks = vi.hoisted(() => ({ logout: vi.fn(), error: vi.fn() }));
vi.mock("~/stores", () => ({
  default: { auth: { logout: mocks.logout, logoutPending: false } },
}));
vi.mock("sonner", () => ({ toast: { error: mocks.error } }));
it("offers a real account-action retry after a safe sign-out failure", async () => {
  const context = {
    t: (key: string) => key,
    stores: { auth: { logoutPending: false } },
  } as ActionContext;
  mocks.logout
    .mockRejectedValueOnce(new Error("private server detail"))
    .mockResolvedValueOnce(undefined);
  await logout.perform(context);
  expect(mocks.error).toHaveBeenCalledWith(
    "Unable to sign out. Try again.",
    expect.objectContaining({
      action: expect.objectContaining({ label: "Retry" }),
    })
  );
  const options = mocks.error.mock.calls[0][1] as {
    action: { onClick: () => void };
  };
  options.action.onClick();
  await vi.waitFor(() => expect(mocks.logout).toHaveBeenCalledTimes(2));
});
it("blocks direct action execution during logout pending", async () => {
  mocks.logout.mockClear();
  const context = {
    stores: { auth: { logoutPending: true } },
  } as ActionContext;
  await logout.perform(context);
  expect(mocks.logout).not.toHaveBeenCalled();
});
