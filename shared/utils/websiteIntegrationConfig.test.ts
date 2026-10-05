import { createWebsiteIntegrationConfig } from "../../server/identity/config";

const local = {
  WEBSITE_INTEGRATION_MODE: "local",
  URL: "http://127.0.0.1:8080/docs",
  WEBSITE_URL: "http://127.0.0.1:8080/",
  HYDRA_PUBLIC_URL: "http://127.0.0.1:14444/",
  OUTLINE_OIDC_CLIENT_ID: "ex-outline-local",
  WEBSITE_INTERNAL_URL: "http://127.0.0.1:8082/",
};

describe("immutable Website integration configuration", () => {
  it("derives the exact local callback and freezes its configuration", () => {
    const config = createWebsiteIntegrationConfig(local);
    expect(config.redirectUri).toBe(
      "http://127.0.0.1:8080/docs/auth/oidc.callback"
    );
    expect(config.clientId).toBe("ex-outline-local");
    expect(Object.isFrozen(config)).toBe(true);
  });
  it("accepts an explicitly reconfigured coherent loopback layout", () => {
    expect(
      createWebsiteIntegrationConfig({
        ...local,
        URL: "http://127.0.0.1:18080/docs",
        WEBSITE_URL: "http://127.0.0.1:18080/",
        HYDRA_PUBLIC_URL: "http://127.0.0.1:24444/",
        WEBSITE_INTERNAL_URL: "http://127.0.0.1:18082/",
      }).websiteOrigin
    ).toBe("http://127.0.0.1:18080");
  });
  it.each([
    { URL: "http://localhost:8080/docs" },
    { URL: "http://127.0.0.1:8081/docs" },
    { WEBSITE_URL: "https://127.0.0.1:8080/" },
    { HYDRA_PUBLIC_URL: "http://remote.test:14444/" },
    { HYDRA_PUBLIC_URL: "http://127.0.0.1:14444/?x=1" },
    { HYDRA_PUBLIC_URL: "http://127.0.0.1:14444/#issuer" },
    { WEBSITE_INTERNAL_URL: "http://user:password@127.0.0.1:8082/" },
    { OUTLINE_OIDC_CLIENT_ID: "ex-outline" },
    { WEBSITE_INTEGRATION_MODE: "other" },
    { HYDRA_PUBLIC_URL: "http://127.0.0.1:8080/" },
  ])("rejects conflicting or unsafe local configuration %j", (changes) => {
    expect(() =>
      createWebsiteIntegrationConfig({ ...local, ...changes })
    ).toThrow();
  });
  it.each(["dev", "full"])("preserves the fixed legacy %s layout", (mode) => {
    const config = createWebsiteIntegrationConfig({
      WEBSITE_INTEGRATION_MODE: mode,
      URL: "http://exwebsite.test:8090/docs",
      HYDRA_PUBLIC_URL: "http://identity.exwebsite.test:8090/",
      OUTLINE_OIDC_CLIENT_ID: "ex-outline",
      WEBSITE_INTERNAL_URL:
        mode === "full" ? "http://server:8080/" : "http://127.0.0.1:18082/",
    });
    expect(config.redirectUri).toBe(
      "http://exwebsite.test:8090/docs/auth/oidc.callback"
    );
    expect(config.clientId).toBe("ex-outline");
  });
});
