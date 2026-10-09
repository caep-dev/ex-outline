import "~/stores";
import env from "~/env";
import RootStore from "./RootStore";

vi.unmock("~/utils/ApiClient");

it("loads integrated public config without sending stale browser credentials", async () => {
  const originalMode = env.WEBSITE_INTEGRATION_ENABLED;
  env.WEBSITE_INTEGRATION_ENABLED = true;
  document.cookie = "accessToken=unrelated-localhost-cookie; path=/";
  const config = {
    websiteIntegrationEnabled: true,
    initialized: true,
    providers: [],
  };
  const fetchMock = vi.fn((url: string, options?: RequestInit) => {
    if (!url.endsWith("/auth.config")) {
      // The constructor's separate auth.info request is not this public read.
      return new Promise<Response>(() => {});
    }
    const hasCredentials = options?.credentials !== "omit";
    return Promise.resolve(
      new Response(
        JSON.stringify(
          hasCredentials
            ? {
                ok: false,
                error: "csrf_error",
                status: 403,
                message: "Request origin is invalid",
              }
            : { data: config }
        ),
        { status: hasCredentials ? 403 : 200 }
      )
    );
  });
  vi.stubGlobal("fetch", fetchMock);
  try {
    const root = new RootStore();
    await expect(root.auth.fetchConfig()).resolves.toBeUndefined();
    expect(root.auth.config).toEqual(config);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/auth\.config$/),
      expect.objectContaining({ credentials: "omit" })
    );
  } finally {
    env.WEBSITE_INTEGRATION_ENABLED = originalMode;
    document.cookie = "accessToken=; Max-Age=0; path=/";
    vi.unstubAllGlobals();
  }
});
