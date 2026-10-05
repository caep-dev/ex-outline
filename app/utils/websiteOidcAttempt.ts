import { docsReturnPath } from "@shared/utils/docsReturnPath";

export interface WebsiteOidcAttempt {
  returnPath: string;
  attemptId: string;
  attemptedAt: number;
}

const key = "website-oidc-attempt";
const ttl = 10 * 60 * 1000;

/**
 * Claims one persisted login attempt, preventing failed callbacks and refreshes from retrying.
 *
 * @param path the requested docs return path.
 * @param origin the configured Website origin.
 * @param explicit whether the user explicitly requested another attempt.
 * @param now the current time in milliseconds.
 * @returns the claimed attempt, or null when retry protection cannot be established.
 */
export function claimWebsiteOidcAttempt(
  path: string,
  origin: string,
  explicit = false,
  now = Date.now()
): WebsiteOidcAttempt | null {
  const returnPath = docsReturnPath(path, origin);
  try {
    const serialized = sessionStorage.getItem(key);
    if (serialized && !explicit) {
      const prior: Partial<WebsiteOidcAttempt> = JSON.parse(serialized);
      if (
        prior.returnPath === returnPath &&
        typeof prior.attemptId === "string" &&
        /^[0-9a-f]{32}$/.test(prior.attemptId) &&
        typeof prior.attemptedAt === "number" &&
        Number.isFinite(prior.attemptedAt) &&
        now >= prior.attemptedAt &&
        now - prior.attemptedAt < ttl
      ) {
        return null;
      }
    }
    const bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    const attempt = {
      returnPath,
      attemptId: Array.from(bytes, (byte) =>
        byte.toString(16).padStart(2, "0")
      ).join(""),
      attemptedAt: now,
    };
    sessionStorage.setItem(key, JSON.stringify(attempt));
    return attempt;
  } catch {
    // Automatic redirects require persistence; explicit user requests remain available.
    return null;
  }
}

/**
 * Clears a completed login attempt once Outline has verified its associated session.
 *
 * @returns after discarding the completed attempt, when storage is available.
 */
export function clearWebsiteOidcAttempt(): void {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // Storage can be unavailable in private browsing contexts.
  }
}
