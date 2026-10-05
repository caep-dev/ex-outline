import env from "~/env";

/** Resolves the public mode before the auth store has been initialized. */
export function isWebsiteIntegration(): boolean {
  return (
    env.WEBSITE_INTEGRATION_ENABLED === true ||
    env.WEBSITE_INTEGRATION_ENABLED === "true"
  );
}
