import { describe, expect, it } from "vitest";
import { createWebsiteIntegrationConfig } from "./config";

const values = {
  WEBSITE_INTEGRATION_MODE: "deployment",
  URL: "https://docs.example/docs",
  WEBSITE_URL: "https://docs.example/",
  HYDRA_PUBLIC_URL: "https://issuer.example/",
  WEBSITE_INTERNAL_URL: "http://server:8080/",
  OUTLINE_OIDC_CLIENT_ID: "ex-outline",
};

describe("deployment configuration", () => {
  it("accepts explicit HTTPS deployment without legacy defaults", () => {
    expect(createWebsiteIntegrationConfig(values)).toMatchObject({
      mode: "deployment",
      websiteOrigin: "https://docs.example",
      redirectUri: "https://docs.example/docs/auth/oidc.callback",
    });
  });
  it("rejects HTTP, mismatched origins, missing values and normalized paths", () => {
    for (const override of [
      { URL: "http://docs.example/docs" },
      { WEBSITE_URL: "https://other.example/" },
      { WEBSITE_URL: "https://docs.example/a/.." },
      { HYDRA_PUBLIC_URL: "http://issuer.example/" },
      { WEBSITE_INTERNAL_URL: "http://server:8080/a/.." },
      { OUTLINE_OIDC_CLIENT_ID: "ex-oidc-probe" },
      { URL: "https://docs.example/a/../docs" },
      { WEBSITE_URL: undefined },
    ]) {
      expect(() => createWebsiteIntegrationConfig({ ...values, ...override })).toThrow();
    }
  });
});
