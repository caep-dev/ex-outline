import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { observable, runInAction } from "mobx";
import { afterEach, expect, it, vi } from "vitest";
import { renderWithTheme } from "~/test/renderWithTheme";
import Reaction from "./Reaction";
const mocks = vi.hoisted(() => ({ auth: { logoutPending: false } }));
vi.mock("~/hooks/useStores", () => ({
  default: () => ({ auth: mocks.auth, emojis: { get: () => undefined } }),
}));
vi.mock("~/hooks/useCurrentUser", () => ({
  default: () => ({ id: "reader" }),
}));
vi.mock("@shared/utils/emoji", () => ({
  getEmojiId: (value: string) => value,
}));
vi.mock("~/components/Emoji", () => ({ Emoji: () => <span>emoji</span> }));
afterEach(cleanup);
it("immediately disables reactions while logout is pending and restores them on failure", () => {
  mocks.auth = observable({ logoutPending: false });
  const add = vi.fn().mockResolvedValue(undefined);
  renderWithTheme(
    <Reaction
      reaction={{ emoji: "smile", userIds: ["other"] }}
      reactedUsers={[]}
      disabled={false}
      onAddReaction={add}
      onRemoveReaction={vi.fn()}
    />
  );
  act(() =>
    runInAction(() => {
      mocks.auth.logoutPending = true;
    })
  );
  const button = screen.getByRole("button");
  expect(button).toBeDisabled();
  fireEvent.click(button);
  expect(add).not.toHaveBeenCalled();
  act(() =>
    runInAction(() => {
      mocks.auth.logoutPending = false;
    })
  );
  fireEvent.click(button);
  expect(add).toHaveBeenCalledWith("smile");
});
