import "~/stores";
import { runInAction } from "mobx";
import { beforeEach, expect, it, vi } from "vitest";
import RootStore from "./RootStore";
const mocks = vi.hoisted(() => ({
  post: vi.fn().mockImplementation(() => new Promise(() => {})),
  fetch: vi.fn(),
  cleanup: vi.fn(),
  assign: vi.fn(),
}));
vi.mock("~/utils/ApiClient", () => ({
  client: {
    post: mocks.post,
    fetch: mocks.fetch,
    setUnauthorizedHandler: vi.fn(),
  },
}));
vi.mock("~/utils/developer", () => ({ deleteAllDatabases: mocks.cleanup }));
vi.mock("~/env", () => ({
  default: { URL: "http://localhost/docs", WEBSITE_INTEGRATION_ENABLED: true },
}));
beforeEach(() => {
  mocks.post.mockReset();
  mocks.fetch.mockReset();
  mocks.cleanup.mockReset();
  mocks.assign.mockReset();
  mocks.post.mockImplementation(() => new Promise(() => {}));
  Object.defineProperty(window, "location", {
    configurable: true,
    value: {
      pathname: "/docs/doc/hello-1234567890",
      search: "",
      hostname: "localhost",
      assign: mocks.assign,
    },
  });
});
function setup() {
  const root = new RootStore();
  root.auth.currentUserId = "same-user";
  root.auth.currentTeamId = "same-team";
  root.auth.config = {
    websiteIntegrationEnabled: true,
    initialized: true,
    providers: [],
  };
  return root;
}
it("sets pending immediately, preflights public targets and adds only verified reading return", async () => {
  const root = setup();
  let resolve!: (value: { data: { id: string } }) => void;
  mocks.fetch.mockReturnValue(
    new Promise((done) => {
      resolve = done;
    })
  );
  mocks.post.mockResolvedValue({
    success: true,
    redirectUrl: "/identity/signed-out",
  });
  const pending = root.auth.logout({ userInitiated: true });
  expect(root.auth.logoutPending).toBe(true);
  expect(mocks.post).not.toHaveBeenCalledWith("/auth.delete");
  resolve({ data: { id: "public" } });
  await pending;
  expect(mocks.assign).toHaveBeenCalledWith(
    "/identity/signed-out?docsReturnTo=%2Fdocs%2Fdoc%2Fhello-1234567890"
  );
  expect(root.auth.currentUserId).toBeNull();
});
it("never exports a private slug and restores write state on revocation failure", async () => {
  const root = setup();
  mocks.fetch.mockRejectedValue(new Error("private"));
  mocks.post.mockRejectedValue(new Error("revoke failed"));
  await expect(root.auth.logout({ userInitiated: true })).rejects.toThrow(
    "revoke failed"
  );
  expect(root.auth.logoutPending).toBe(false);
  expect(root.auth.currentUserId).toBe("same-user");
  expect(mocks.assign).not.toHaveBeenCalled();
});
it("aborts old logout when a newer verified same-user session arrives during preflight", async () => {
  const root = setup();
  let resolve!: (value: { data: { id: string } }) => void;
  mocks.fetch.mockReturnValue(
    new Promise((done) => {
      resolve = done;
    })
  );
  const pending = root.auth.logout({ userInitiated: true });
  runInAction(() => {
    root.auth.sessionGeneration += 1;
  });
  resolve({ data: { id: "public" } });
  await pending;
  expect(mocks.post).not.toHaveBeenCalledWith("/auth.delete");
  expect(root.auth.currentUserId).toBe("same-user");
  expect(mocks.assign).not.toHaveBeenCalled();
});
it("does not clear a newer session after cache cleanup completes", async () => {
  const root = setup();
  mocks.fetch.mockResolvedValue({ data: { id: "public" } });
  mocks.post.mockResolvedValue({
    success: true,
    redirectUrl: "/identity/signed-out",
  });
  let resolve!: () => void;
  mocks.cleanup.mockReturnValue(
    new Promise<void>((done) => {
      resolve = done;
    })
  );
  const pending = root.auth.logout({ userInitiated: true });
  await vi.waitFor(() => expect(mocks.cleanup).toHaveBeenCalled());
  runInAction(() => {
    root.auth.sessionGeneration += 1;
  });
  resolve();
  await pending;
  expect(root.auth.currentUserId).toBe("same-user");
  expect(mocks.assign).not.toHaveBeenCalled();
});
it("rejects a modified server redirect before local cleanup", async () => {
  const root = setup();
  mocks.post.mockResolvedValue({
    success: true,
    redirectUrl: "/identity/signed-out?evil=1",
  });
  await expect(root.auth.logout({ userInitiated: false })).rejects.toThrow(
    "Invalid integrated"
  );
  expect(mocks.cleanup).not.toHaveBeenCalled();
  expect(root.auth.currentUserId).toBe("same-user");
});

it("advances generation on successful same-user auth.info and invalidates public projections", async () => {
  const root = setup();
  vi.spyOn(root, "enablePersistence").mockImplementation(() => {});
  const previous = root.auth.sessionGeneration;
  const publicGeneration = root.publicDocs.generation;
  mocks.post.mockResolvedValue({
    data: {
      user: {
        id: "same-user",
        name: "Reader",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      team: { id: "same-team", name: "Team" },
      groups: [],
      groupUsers: [],
    },
    policies: [],
  });
  await root.auth.fetchAuth();
  expect(root.auth.sessionGeneration).toBe(previous + 1);
  expect(root.publicDocs.generation).toBeGreaterThan(publicGeneration);
});
it("projects policies as read-only during pending and restores abilities after failure", () => {
  const root = setup();
  root.policies.add({
    id: "doc",
    abilities: { read: true, update: true, comment: true, delete: true },
  });
  root.auth.logoutPending = true;
  expect(root.policies.abilities("doc")).toEqual({
    read: true,
    update: false,
    comment: false,
    delete: false,
  });
  root.auth.logoutPending = false;
  expect(root.policies.abilities("doc").update).toBe(true);
});

it("ignores auth.info responses from a session cleared after the request started", async () => {
  const root = setup();
  vi.spyOn(root, "enablePersistence").mockImplementation(() => {});
  let resolve!: (value: object) => void;
  mocks.post.mockReturnValue(
    new Promise((done) => {
      resolve = done;
    })
  );
  const pending = root.auth.fetchAuth();
  root.auth.sessionGeneration += 1;
  root.auth.currentUserId = null;
  resolve({
    data: {
      user: {
        id: "same-user",
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      team: { id: "same-team" },
      groups: [],
      groupUsers: [],
    },
    policies: [],
  });
  await pending;
  expect(root.auth.currentUserId).toBeNull();
});

it("exports only the root after a private preflight and tolerates local cleanup failure", async () => {
  const root = setup();
  mocks.fetch.mockRejectedValue(new Error("private"));
  mocks.post.mockResolvedValue({
    success: true,
    redirectUrl: "/identity/signed-out",
  });
  mocks.cleanup.mockRejectedValue(new Error("cache failed"));
  await root.auth.logout({ userInitiated: true });
  expect(mocks.assign).toHaveBeenCalledWith(
    "/identity/signed-out?docsReturnTo=%2Fdocs%2F"
  );
  expect(root.auth.currentUserId).toBeNull();
});
it("does not revoke or clear a newer session while an old delete request is pending", async () => {
  const root = setup();
  let resolve!: (value: object) => void;
  mocks.post.mockReturnValue(
    new Promise((done) => {
      resolve = done;
    })
  );
  const pending = root.auth.logout({ userInitiated: false });
  root.auth.sessionGeneration += 1;
  resolve({ success: true, redirectUrl: "/identity/signed-out" });
  await pending;
  expect(root.auth.currentUserId).toBe("same-user");
  expect(mocks.cleanup).not.toHaveBeenCalled();
  expect(mocks.assign).not.toHaveBeenCalled();
});
it("direct logout without a reading candidate uses the directory", async () => {
  const root = setup();
  mocks.post.mockResolvedValue({
    success: true,
    redirectUrl: "/identity/signed-out",
  });
  await root.auth.logout({ userInitiated: false });
  expect(mocks.fetch).not.toHaveBeenCalled();
  expect(mocks.assign).toHaveBeenCalledWith(
    "/identity/signed-out?docsReturnTo=%2Fdocs%2F"
  );
});

it("does not let an old finally release a newer pending logout", async () => {
  const root = setup();
  const resolves: ((value: object) => void)[] = [];
  mocks.fetch.mockImplementation(
    () =>
      new Promise((done) => {
        resolves.push(done);
      })
  );
  mocks.post.mockRejectedValue(new Error("revoke failed"));
  const old = root.auth.logout({ userInitiated: true });
  root.auth.sessionGeneration += 1;
  const latest = root.auth.logout({ userInitiated: true });
  resolves[0]({ data: { id: "public" } });
  await old;
  expect(root.auth.logoutPending).toBe(true);
  resolves[1]({ data: { id: "public" } });
  await expect(latest).rejects.toThrow("revoke failed");
  expect(root.auth.logoutPending).toBe(false);
});
