import { docsReturnPath } from "./docsReturnPath";

describe("docs return navigation", () => {
  it.each(["http://127.0.0.1:8080", "http://exwebsite.test:8090"])(
    "retains document and query on %s",
    (origin) => {
      expect(docsReturnPath("/docs/doc/hello?revision=1#editor", origin)).toBe(
        "/docs/doc/hello?revision=1"
      );
    }
  );
  it.each([
    "//evil.test/docs",
    "/doc",
    "/docsevil",
    "/docs/../identity/login",
    "/docs/%2e%2e/admin",
    "/docs%2fadmin",
    "/docs/\\evil",
    "/docs/\nidentity",
    "https://evil.test/docs",
  ])("rejects %s", (path) => {
    expect(docsReturnPath(path, "http://127.0.0.1:8080")).toBe("/docs/");
  });
});
