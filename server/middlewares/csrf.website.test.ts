import { CSRF } from "@shared/constants";
import env from "@server/env";
import { bundleToken, generateRawToken } from "@server/utils/csrf";
import { attachCSRFToken, verifyCSRFToken } from "./csrf";

it("protects integrated cookie POSTs with exact origin and host-bound double submit", async () => {
  const originalMode = env.WEBSITE_INTEGRATION_ENABLED;
  const originalUrl = env.URL;
  env.WEBSITE_INTEGRATION_ENABLED = true;
  env.URL = "http://exwebsite.test:8090/docs";
  try {
    const csrf = bundleToken(generateRawToken(16), env.SECRET_KEY);
    const request = (
      path: string,
      origin: string | undefined,
      suppliedCsrf = csrf,
      mountPath = "/api",
      method = "POST"
    ) => {
      const cookie = (name: string) =>
        name === "exdocs_access"
          ? "session"
          : name === CSRF.cookieName
            ? csrf
            : undefined;
      return {
        method,
        path,
        mountPath,
        originalUrl: `${mountPath}${path}`,
        request: {
          secure: false,
          body: { token: "spoofed" },
          query: {},
          get: () => "Bearer spoofed",
        },
        cookies: { get: cookie },
        get: (name: string) =>
          name.toLowerCase() === "origin"
            ? (origin ?? "")
            : name.toLowerCase() === CSRF.headerName
              ? suppliedCsrf
              : "",
      } as never;
    };
    const verify = verifyCSRFToken();
    await expect(
      verify(
        request("/auth.info", "http://sibling.exwebsite.test:8090"),
        vi.fn()
      )
    ).rejects.toHaveProperty("status", 403);
    await expect(
      verify(request("/auth.info", undefined), vi.fn())
    ).rejects.toHaveProperty("status", 403);
    await expect(
      verify(request("/auth.info", "http://exwebsite.test:8090", ""), vi.fn())
    ).rejects.toHaveProperty("status", 403);
    const next = vi.fn();
    await verify(request("/auth.info", "http://exwebsite.test:8090"), next);
    expect(next).toHaveBeenCalledOnce();
    for (const path of [
      "/public.collections.list",
      "/public.documents.list",
      "/public.documents.info",
      "/public.documents.search",
    ]) {
      const publicNext = vi.fn();
      await verify(request(path, undefined, ""), publicNext);
      expect(publicNext).toHaveBeenCalledOnce();
    }
    for (const [path, mountPath, method] of [
      ["/public.documents.searchExtra", "/api", "POST"],
      ["/public.documents.search", "/auth", "POST"],
      ["/public.documents.search", "/api", "PATCH"],
    ]) {
      await expect(
        verify(request(path, undefined, "", mountPath, method), vi.fn())
      ).rejects.toHaveProperty("status", 403);
    }

    const setCookie = vi.fn();
    await attachCSRFToken()(
      {
        method: "GET",
        request: { secure: false },
        cookies: { set: setCookie },
      } as never,
      vi.fn()
    );
    expect(setCookie).toHaveBeenCalledWith(
      CSRF.cookieName,
      expect.any(String),
      expect.objectContaining({
        path: "/docs",
        httpOnly: false,
        sameSite: "lax",
      })
    );
    setCookie.mockClear();
    await attachCSRFToken()(
      {
        method: "GET",
        request: { secure: true },
        cookies: { set: setCookie },
      } as never,
      vi.fn()
    );
    expect(setCookie).toHaveBeenCalledWith(
      CSRF.secureCookieName,
      expect.any(String),
      expect.objectContaining({ path: "/", secure: true, httpOnly: false })
    );
  } finally {
    env.WEBSITE_INTEGRATION_ENABLED = originalMode;
    env.URL = originalUrl;
  }
});
