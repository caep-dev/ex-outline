import { beforeEach, expect, it, vi } from "vitest";
import { preflightDocsReading } from "./docsReadingPreflight";
const fetch = vi.hoisted(() => vi.fn());
vi.mock("~/utils/ApiClient", () => ({ client: { fetch } }));
const id = "12345678-1234-1234-1234-123456789abc";
beforeEach(() => fetch.mockReset());
it("re-lists a collection scope from page zero instead of trusting previous visibility", async () => {
  fetch
    .mockResolvedValueOnce({
      data: [{ id: "other" }],
      pagination: { offset: 0, hasMore: true },
    })
    .mockResolvedValueOnce({
      data: [{ id }],
      pagination: { offset: 1, hasMore: false },
    });
  expect(
    await preflightDocsReading(
      `/docs/search?q=hello&collectionId=${id}`,
      "https://example.test"
    )
  ).toBe(true);
  expect(fetch.mock.calls[1][2]).toEqual({ offset: 1, limit: 100 });
  fetch.mockResolvedValueOnce({
    data: [],
    pagination: { offset: 0, hasMore: false },
  });
  expect(
    await preflightDocsReading(
      `/docs/public/collection/${id}`,
      "https://example.test"
    )
  ).toBe(false);
  expect(fetch.mock.calls[2][2]).toEqual({ offset: 0, limit: 100 });
});
it("rejects collection pagination that does not progress", async () => {
  fetch.mockResolvedValue({
    data: [],
    pagination: { offset: 0, hasMore: true },
  });
  await expect(
    preflightDocsReading(
      `/docs/public/collection/${id}`,
      "https://example.test"
    )
  ).rejects.toThrow("Invalid public pagination");
});
