import env from "@server/env";
import { Attachment } from "@server/models";

describe("Attachment URLs", () => {
  it("keeps private attachment redirects within the configured public mount", () => {
    const originalUrl = env.URL;
    try {
      for (const [url, prefix] of [
        ["http://127.0.0.1:8080/docs", "/docs"],
        ["http://127.0.0.1:8080/docs/", "/docs"],
        ["https://outline.example.com", ""],
      ]) {
        env.URL = url;
        const attachment = Attachment.build({ id: "image-id", acl: "private" });
        expect(attachment.url).toBe(
          `${prefix}/api/attachments.redirect?id=image-id`
        );
        expect(Attachment.getRedirectUrl("image-id")).toBe(attachment.url);
      }
    } finally {
      env.URL = originalUrl;
    }
  });
});
