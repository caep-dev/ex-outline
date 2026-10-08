import "~/stores";
import { runInAction } from "mobx";
import RootStore from "./RootStore";

it("drops public DTOs synchronously when identity or workspace changes", () => {
  const root = new RootStore();
  const generation = root.publicDocs?.generation ?? 0;
  runInAction(() => {
    root.auth.currentUserId = "other-user";
    root.auth.currentTeamId = "other-team";
  });
  expect(root.publicDocs?.generation).toBeGreaterThan(generation);
  expect(root.publicDocs?.document.data).toBeUndefined();
});
it("includes ephemeral public projections in RootStore.clear", () => {
  const root = new RootStore();
  root.publicDocs?.expandedIds.add("public");
  root.clear();
  expect(root.publicDocs?.expandedIds.size).toBe(0);
});
