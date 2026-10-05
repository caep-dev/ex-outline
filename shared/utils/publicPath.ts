/**
 * Extracts the public application path prefix.
 *
 * @param configuredUrl the complete public application URL.
 * @returns the normalized prefix, or an empty string for root deployments.
 * @throws if the URL has credentials, a query, a fragment or an unsafe protocol.
 */
export function publicBasePath(configuredUrl: string): string {
  const url = new URL(configuredUrl);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error("Invalid public application URL");
  }
  return url.pathname.replace(/\/+$/, "");
}

/**
 * Prefixes a root-relative application path exactly once.
 *
 * @param basePath the public path prefix.
 * @param path the application path.
 * @returns a path in the public namespace.
 * @throws if the path is not root-relative.
 */
export function publicPath(basePath: string, path: string): string {
  if (!path.startsWith("/") || path.startsWith("//")) {
    throw new Error("Expected a root-relative application path");
  }
  const prefix = basePath.replace(/\/+$/, "");
  return !prefix || path === prefix || path.startsWith(`${prefix}/`)
    ? path
    : `${prefix}${path}`;
}

/**
 * Resolves a mounted development view without changing direct Outline access.
 *
 * @param configuredUrl the regular direct application URL.
 * @param requestedOrigin the origin forwarded by the development gateway.
 * @param allowedOrigins the explicitly configured local entry origins.
 * @returns the mounted URL only for an allowed development entry.
 */
export function developmentPublicUrl(
  configuredUrl: string,
  requestedOrigin: string,
  allowedOrigins: string[]
): string {
  return isAllowedDevelopmentOrigin(requestedOrigin, allowedOrigins)
    ? `${requestedOrigin}/docs`
    : configuredUrl;
}

/**
 * Matches an explicitly configured development entry without prefix matching.
 *
 * @param origin the browser request origin.
 * @param allowedOrigins the configured entry origins.
 * @returns whether a non-empty origin is an exact allowlist match.
 */
export function isAllowedDevelopmentOrigin(
  origin: string | undefined,
  allowedOrigins: string[]
): boolean {
  return !!origin && allowedOrigins.includes(origin);
}

/**
 * Builds a public URL for a mounted application path.
 *
 * @param configuredUrl the complete public application URL.
 * @param path the root-relative application path.
 * @returns an absolute public URL.
 */
export function publicUrl(configuredUrl: string, path: string): string {
  const url = new URL(configuredUrl);
  return `${url.origin}${publicPath(publicBasePath(configuredUrl), path)}`;
}
