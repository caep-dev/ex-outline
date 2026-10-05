/**
 * Keeps return navigation inside the fixed docs mount on the configured origin.
 *
 * @param value the requested root-relative return path.
 * @param origin the approved Website public origin.
 * @returns a safe docs path and query, or the public directory.
 */
export function docsReturnPath(value: unknown, origin: string): string {
  if (
    typeof value !== "string" ||
    value.length > 2048 ||
    !value.startsWith("/docs") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    Array.from(value).some((character) => character.charCodeAt(0) <= 32) ||
    /%(?:2f|5c|2e|00|0a|0d)/i.test(value) ||
    value.includes("/../") ||
    value.endsWith("/..")
  ) {
    return "/docs/";
  }
  try {
    const url = new URL(value, origin);
    if (
      url.origin !== origin ||
      (url.pathname !== "/docs" && !url.pathname.startsWith("/docs/"))
    ) {
      return "/docs/";
    }
    return `${url.pathname}${url.search}`;
  } catch {
    return "/docs/";
  }
}
