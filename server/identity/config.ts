import environment from "../utils/environment";

export interface WebsiteIntegrationConfig {
  readonly mode: "local" | "dev" | "full";
  readonly websiteOrigin: string;
  readonly websiteUrl: string;
  readonly outlineUrl: string;
  readonly issuer: string;
  readonly clientId: "ex-outline-local" | "ex-outline";
  readonly redirectUri: string;
  readonly websiteInternalUrl: string;
}

/**
 * Parses the approved integration layout without deriving URLs from requests.
 *
 * @param values the effective process environment, taking precedence over env files.
 * @returns an immutable configuration for the selected integration mode.
 * @throws if an address or client conflicts with the approved layout.
 */
export function createWebsiteIntegrationConfig(
  values: Record<string, string | undefined>
): Readonly<WebsiteIntegrationConfig> {
  const mode = values.WEBSITE_INTEGRATION_MODE ?? "dev";
  if (mode !== "local" && mode !== "dev" && mode !== "full") {
    throw new Error("INTEGRATION_MODE_INVALID");
  }
  const outline = parseUrl(values.URL, "/docs");
  const website = parseUrl(values.WEBSITE_URL ?? `${outline.origin}/`, "/");
  const issuer = parseUrl(values.HYDRA_PUBLIC_URL, "/");
  const internal = parseUrl(values.WEBSITE_INTERNAL_URL, "/");
  const clientId = mode === "local" ? "ex-outline-local" : "ex-outline";
  if (
    website.origin !== outline.origin ||
    values.OUTLINE_OIDC_CLIENT_ID !== clientId
  ) {
    throw new Error("INTEGRATION_LAYOUT_CONFLICT");
  }
  if (mode === "local") {
    for (const url of [website, outline, issuer, internal]) {
      if (
        url.protocol !== "http:" ||
        url.hostname !== "127.0.0.1" ||
        !url.port
      ) {
        throw new Error("INTEGRATION_LOCAL_ADDRESS_INVALID");
      }
    }
    if (new Set([website.origin, issuer.origin, internal.origin]).size !== 3) {
      throw new Error("INTEGRATION_LOCAL_PORT_CONFLICT");
    }
  } else if (
    outline.href !== "http://exwebsite.test:8090/docs" ||
    issuer.href !== "http://identity.exwebsite.test:8090/" ||
    internal.protocol !== "http:" ||
    !["127.0.0.1", "server"].includes(internal.hostname) ||
    !internal.port
  ) {
    throw new Error("INTEGRATION_LEGACY_LAYOUT_CONFLICT");
  }
  return Object.freeze({
    mode,
    websiteOrigin: website.origin,
    websiteUrl: website.href,
    outlineUrl: outline.href,
    issuer: issuer.href,
    clientId,
    redirectUri: `${outline.href}/auth/oidc.callback`,
    websiteInternalUrl: internal.href,
  });
}

/**
 * Returns the validated immutable configuration from the effective environment.
 *
 * @returns the approved configuration.
 * @throws if the process environment conflicts with the selected layout.
 */
export function websiteIntegrationConfig(): Readonly<WebsiteIntegrationConfig> {
  return createWebsiteIntegrationConfig(environment);
}

function parseUrl(value: string | undefined, pathname: string): URL {
  if (!value) {
    throw new Error("INTEGRATION_ADDRESS_MISSING");
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("INTEGRATION_ADDRESS_INVALID");
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.pathname !== pathname ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    value.includes("\\") ||
    Array.from(value).some((character) => character.charCodeAt(0) <= 32)
  ) {
    throw new Error("INTEGRATION_ADDRESS_INVALID");
  }
  return url;
}
