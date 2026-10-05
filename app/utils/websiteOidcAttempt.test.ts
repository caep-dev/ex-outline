import {
  claimWebsiteOidcAttempt,
  clearWebsiteOidcAttempt,
} from "./websiteOidcAttempt";

const origin = "http://127.0.0.1:8080";
beforeEach(() => sessionStorage.clear());

describe("bounded Website automatic login", () => {
  it("persists a safe path, random identifier and time before redirecting", () => {
    const attempt = claimWebsiteOidcAttempt(
      "/docs/doc/hello?revision=2",
      origin,
      false,
      1000
    );
    expect(attempt).toMatchObject({
      returnPath: "/docs/doc/hello?revision=2",
      attemptedAt: 1000,
    });
    expect(attempt?.attemptId).toMatch(/^[0-9a-f]{32}$/);
    expect(
      JSON.parse(sessionStorage.getItem("website-oidc-attempt") ?? "{}")
    ).toEqual(attempt);
  });
  it("blocks a failed round trip and passive refresh for the same document", () => {
    claimWebsiteOidcAttempt("/docs/doc/hello", origin, false, 1000);
    expect(
      claimWebsiteOidcAttempt("/docs/doc/hello", origin, false, 2000)
    ).toBeNull();
    expect(
      claimWebsiteOidcAttempt("/docs/doc/hello", origin, false, 600999)
    ).toBeNull();
    expect(
      claimWebsiteOidcAttempt("/docs/doc/hello", origin, false, 601000)
    ).not.toBeNull();
  });
  it("replaces the attempt for a new document or explicit retry", () => {
    const first = claimWebsiteOidcAttempt(
      "/docs/doc/hello",
      origin,
      false,
      1000
    );
    const second = claimWebsiteOidcAttempt(
      "/docs/doc/other",
      origin,
      false,
      2000
    );
    expect(second?.attemptId).not.toBe(first?.attemptId);
    expect(
      claimWebsiteOidcAttempt("/docs/doc/other", origin, true, 3000)
    ).not.toBeNull();
    expect(
      claimWebsiteOidcAttempt("/docs/doc/other", origin, false, 3001)
    ).toBeNull();
  });
  it("clears successfully established sessions without losing refresh protection on failure", () => {
    claimWebsiteOidcAttempt("/docs/", origin);
    clearWebsiteOidcAttempt();
    expect(sessionStorage.getItem("website-oidc-attempt")).toBeNull();
  });
  it("fails closed when persistent retry protection is unavailable", () => {
    const spy = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new Error("unavailable");
      });
    expect(claimWebsiteOidcAttempt("/docs/", origin)).toBeNull();
    spy.mockRestore();
  });
});
