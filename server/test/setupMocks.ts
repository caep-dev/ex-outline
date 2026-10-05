import type * as IdentityConfig from "@server/identity/config";
// This file runs before the test environment is set up to ensure mocks are registered early.
// It prevents real Redis clients from being initialized during module imports.

import { vi } from "vitest";
import type * as IORedisMock from "ioredis-mock";
import { __setRequireDirectoryCache } from "@server/utils/fs";

// The disposable helper intentionally uses unreachable identity endpoints and
// a fixture client. Keep that fixture inside tests; production parsing stays strict.
vi.mock("@server/identity/config", async (importOriginal) => {
  const actual = await importOriginal<typeof IdentityConfig>();
  return {
    ...actual,
    websiteIntegrationConfig: () => {
      if (
        process.env.OUTLINE_OIDC_CLIENT_ID !== "isolated-outline-test-client"
      ) {
        return actual.websiteIntegrationConfig();
      }
      return Object.freeze({
        mode: "dev" as const,
        websiteOrigin: "http://exwebsite.test:8090",
        websiteUrl: "http://exwebsite.test:8090/",
        outlineUrl: "http://exwebsite.test:8090/docs",
        issuer:
          process.env.HYDRA_PUBLIC_URL ??
          "http://identity.exwebsite.test:8090/",
        clientId: "ex-outline" as const,
        redirectUri: "http://exwebsite.test:8090/docs/auth/oidc.callback",
        websiteInternalUrl:
          process.env.WEBSITE_INTERNAL_URL ?? "http://127.0.0.1:1/",
      });
    },
  };
});

// Pre-populate the requireDirectory cache used by @server/utils/fs so that
// tasks/processors/email-templates can be looked up via their pre-loaded
// modules instead of via Node's require(), which cannot resolve TypeScript
// files with aliased imports under Vitest. The eager globs intentionally
// exclude index.ts files (which call requireDirectory themselves and would
// recurse) and any files whose imports would themselves load the directory
// they live in.
__setRequireDirectoryCache(
  "emails/templates",
  import.meta.glob(
    ["../emails/templates/*.{js,ts,tsx}", "!**/index.*", "!**/*.test.*"],
    { eager: true }
  )
);
__setRequireDirectoryCache(
  "queues/processors",
  import.meta.glob(
    ["../queues/processors/*.{js,ts,tsx}", "!**/index.*", "!**/*.test.*"],
    { eager: true }
  )
);
__setRequireDirectoryCache(
  "queues/tasks",
  import.meta.glob(
    ["../queues/tasks/*.{js,ts,tsx}", "!**/index.*", "!**/*.test.*"],
    { eager: true }
  )
);

vi.mock("ioredis", async () => {
  const mod = await vi.importActual<typeof IORedisMock>("ioredis-mock");
  return mod;
});

vi.mock("@server/utils/MutexLock");

vi.mock("@aws-sdk/signature-v4-crt", () => ({}));

// Auto-mock these modules using the corresponding files under server/__mocks__/.
// Vitest requires an explicit vi.mock() call to wire them up.
vi.mock("bull", () => import("../__mocks__/bull"));
vi.mock("dd-trace", async () => {
  const mod = await import("../__mocks__/dd-trace");
  return { default: mod.mockTracer, ...mod };
});
vi.mock("franc", () => import("../__mocks__/franc"));
vi.mock("iso-639-3", () => import("../__mocks__/iso-639-3"));
vi.mock(
  "request-filtering-agent",
  () => import("../__mocks__/request-filtering-agent")
);
