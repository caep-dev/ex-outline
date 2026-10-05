import { safeReturnPath } from "./websiteOidc";

describe("Website OIDC return path", () => {
  it("keeps only local docs paths and strips fragments", () => {
    expect(safeReturnPath("/docs/doc/my-note?revision=1#editor")).toBe(
      "/docs/doc/my-note?revision=1"
    );
    expect(safeReturnPath("/docs/")).toBe("/docs/");
  });

  it.each([
    "//evil.test/docs",
    "https://evil.test/docs",
    "/docs/\\evil",
    "/docs%2fadmin",
    "/other",
    "/docs/../identity/login",
  ])("rejects unsafe return path %s", (path) => {
    expect(safeReturnPath(path)).toBe("/docs/");
  });
});
