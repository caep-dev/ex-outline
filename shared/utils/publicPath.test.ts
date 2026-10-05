import { describe, expect, it } from "vitest";
import {
  developmentPublicUrl,
  isAllowedDevelopmentOrigin,
  publicBasePath,
  publicPath,
} from "./publicPath";

describe("document public path", () => {
  it("keeps mounted navigation, API and realtime paths inside /docs exactly once", () => {
    const base = publicBasePath("http://127.0.0.1:8080/docs");
    expect(publicPath(base, "/api/documents.info")).toBe(
      "/docs/api/documents.info"
    );
    expect(publicPath(base, "/realtime")).toBe("/docs/realtime");
    expect(publicPath(base, "/docs/doc/example")).toBe("/docs/doc/example");
    expect(publicBasePath("https://localhost:3100/")).toBe("");
  });

  it("only accepts configured development entry origins and preserves direct access", () => {
    const configured = "https://local.outline.dev:3100";
    const allowed = ["http://127.0.0.1:8080", "http://127.0.0.1:8081"];
    expect(developmentPublicUrl(configured, allowed[1], allowed)).toBe(
      `${allowed[1]}/docs`
    );
    expect(developmentPublicUrl(configured, "", allowed)).toBe(configured);
    expect(
      developmentPublicUrl(configured, "https://attacker.example", allowed)
    ).toBe(configured);
  });

  it("rejects missing origins and lookalike hosts for development realtime connections", () => {
    expect(isAllowedDevelopmentOrigin(undefined, [""])).toBe(false);
    expect(
      isAllowedDevelopmentOrigin("http://127.0.0.1:8080.evil", [
        "http://127.0.0.1:8080",
      ])
    ).toBe(false);
    expect(
      isAllowedDevelopmentOrigin("http://127.0.0.1:8080", [
        "http://127.0.0.1:8080",
      ])
    ).toBe(true);
  });
});
