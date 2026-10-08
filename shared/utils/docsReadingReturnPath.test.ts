import vectors from "../../../../.notes/docs-integration/fixtures/docs-return-vectors.json";
import { docsReturnPath, parseDocsReturnPath } from "./docsReadingReturnPath";

describe("safe reading return paths", () => {
  it.each(vectors)(
    "validates $value before normalization",
    ({ value, valid, path }) => {
      expect(docsReturnPath(value, "https://example.test")).toBe(path);
      expect(parseDocsReturnPath(value, "https://example.test").valid).toBe(
        valid
      );
    }
  );
});
