import env from "@server/env";
import LocalStorage from "./LocalStorage";

describe("LocalStorage", () => {
  it("keeps upload and file URLs within the configured public mount", () => {
    const originalUrl = env.URL;
    const storage = new LocalStorage();

    try {
      for (const [url, prefix] of [
        ["http://127.0.0.1:8080/docs", "/docs"],
        ["http://127.0.0.1:8080/docs/", "/docs"],
        ["https://outline.example.com", ""],
      ]) {
        env.URL = url;
        expect(storage.getUploadUrl()).toBe(`${prefix}/api/files.create`);
        expect(storage.getUrlForKey("uploads/example/image.png")).toBe(
          `${prefix}/api/files.get?key=uploads/example/image.png`
        );
      }
    } finally {
      env.URL = originalUrl;
    }
  });
});
