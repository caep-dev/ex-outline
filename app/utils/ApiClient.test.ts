import { CSRF } from "@shared/constants";
import type appEnv from "~/env";
import type { client as ApiClientInstance } from "./ApiClient";

vi.unmock("~/utils/ApiClient");

describe("ApiClient CSRF headers", () => {
  let client: typeof ApiClientInstance;
  let env: typeof appEnv;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeAll(async () => {
    window.env.URL = "http://localhost/docs";
    ({ default: env } = await import("~/env"));
    env.URL = window.env.URL;
    ({ client } = await import("./ApiClient"));
  });

  beforeEach(() => {
    document.cookie = `${CSRF.cookieName}=first; path=/`;
    fetchMock = vi.fn(() =>
      Promise.resolve(
        new Response(JSON.stringify({ data: {} }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      )
    );
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    document.cookie = `${CSRF.cookieName}=; Max-Age=0; path=/`;
    vi.unstubAllGlobals();
  });

  const requestHeaders = (fetchMock: ReturnType<typeof vi.fn>): Headers => {
    const [, options] = fetchMock.mock.lastCall ?? [];
    return new Headers(options?.headers);
  };

  it("sends the current token for integrated read-only and write POSTs", async () => {
    env.WEBSITE_INTEGRATION_ENABLED = true;

    for (const path of [
      "/auth.info",
      "/documents.list",
      "/documents.create",
      "/batch",
    ]) {
      await client.fetch(path, "POST", {}, { retry: false });
      expect(requestHeaders(fetchMock).get(CSRF.headerName)).toBe("first");
    }

    document.cookie = `${CSRF.cookieName}=second; path=/`;
    await client.fetch("/auth.info", "POST", {}, { retry: false });
    expect(requestHeaders(fetchMock).get(CSRF.headerName)).toBe("second");
  });

  it("covers every non-safe method but not GET", async () => {
    env.WEBSITE_INTEGRATION_ENABLED = true;

    for (const method of ["POST", "PUT", "PATCH", "DELETE"] as const) {
      await client.fetch("/auth.info", method, {}, { retry: false });
      expect(requestHeaders(fetchMock).get(CSRF.headerName)).toBe("first");
    }

    await client.fetch("/auth.info", "GET", undefined, { retry: false });
    expect(requestHeaders(fetchMock).has(CSRF.headerName)).toBe(false);
  });

  it.each(["omit", "same-origin", "include"] as const)(
    "honors the caller's %s credentials policy",
    async (credentials) => {
      await client.fetch("/auth.config", "POST", undefined, {
        credentials,
        retry: false,
      });
      expect(fetchMock.mock.lastCall?.[1]?.credentials).toBe(credentials);
    }
  );

  it("keeps the upstream read-only exemption", async () => {
    env.WEBSITE_INTEGRATION_ENABLED = false;

    await client.fetch("/auth.info", "POST", {}, { retry: false });
    expect(requestHeaders(fetchMock).has(CSRF.headerName)).toBe(false);

    await client.fetch("/documents.create", "POST", {}, { retry: false });
    expect(requestHeaders(fetchMock).get(CSRF.headerName)).toBe("first");
  });

  it("never adds the cookie token to cross-origin requests", async () => {
    env.WEBSITE_INTEGRATION_ENABLED = true;

    await client.fetch(
      "https://storage.example.test/api/documents.create",
      "POST",
      {},
      { retry: false }
    );
    expect(requestHeaders(fetchMock).has(CSRF.headerName)).toBe(false);

    await client.fetch(
      "/documents.create",
      "POST",
      {},
      {
        retry: false,
        baseUrl: "https://storage.example.test/api",
      }
    );
    expect(requestHeaders(fetchMock).has(CSRF.headerName)).toBe(false);

    await client.fetch(
      "/documents.create",
      "POST",
      {},
      {
        retry: false,
        baseUrl: "https://storage.example.test/api",
        headers: { [CSRF.headerName]: "first" },
      }
    );
    expect(requestHeaders(fetchMock).has(CSRF.headerName)).toBe(false);
  });
});
