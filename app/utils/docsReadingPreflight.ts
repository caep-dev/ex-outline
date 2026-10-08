import type {
  PublicCollection,
  PublicPage,
} from "@shared/types/websiteIntegration";
import { docsReturnPath } from "@shared/utils/docsReadingReturnPath";
import { client } from "~/utils/ApiClient";

/** Rechecks a sanitized reading target through anonymous RPCs, without cached member state.
 *
 * @param target the sanitized docs reading path.
 * @param origin the configured Website origin.
 * @returns whether the target remains publicly available.
 */
export async function preflightDocsReading(
  target: string,
  origin: string
): Promise<boolean> {
  const safe = docsReturnPath(target, origin);
  const url = new URL(safe, origin);
  if (url.pathname.startsWith("/docs/doc/")) {
    await client.fetch("/public.documents.info", "POST", {
      id: url.pathname.slice("/docs/doc/".length),
    });
    return true;
  }
  const id = url.pathname.startsWith("/docs/public/collection/")
    ? url.pathname.slice("/docs/public/collection/".length)
    : url.searchParams.get("collectionId");
  if (id) {
    let offset = 0;
    const seen = new Set<string>();
    while (true) {
      const page = await client.fetch<PublicPage<PublicCollection>>(
        "/public.collections.list",
        "POST",
        { offset, limit: 100 }
      );
      if (page.pagination.offset !== offset) {
        throw new Error("Invalid public pagination");
      }
      if (page.data.some((collection) => collection.id === id)) {
        return true;
      }
      if (!page.pagination.hasMore) {
        return false;
      }
      const fresh = page.data.filter((collection) => !seen.has(collection.id));
      if (!fresh.length) {
        throw new Error("Invalid public pagination");
      }
      page.data.forEach((collection) => seen.add(collection.id));
      offset += page.data.length;
    }
  }
  return true;
}
