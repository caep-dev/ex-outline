import { createHash, generateKeyPairSync, randomUUID, sign } from "node:crypto";
import http from "node:http";
import type { AddressInfo } from "node:net";

import env from "@server/env";
import WebsiteIdentityClient from "@server/identity/WebsiteIdentityClient";
import { ExternalSession } from "@server/models";
import { bootstrapIntegration } from "@server/scripts/integration-bootstrap";
import { getTestServer } from "@server/test/support";

const server = getTestServer();
const subject = randomUUID();
const websiteSessionId = randomUUID();
const profile = {
  id: subject,
  nickname: "OIDC fixture",
  email: "oidc@example.test",
  avatarUrl: null,
  profileVersion: 1,
};
const returnPath = "/docs/doc/readable-AbCdEfGhIj?revision=1";
const publicFailure = `${returnPath}#website-signin-unavailable`;
const keys = generateKeyPairSync("rsa", { modulusLength: 2048 });
const wrongKeys = generateKeyPairSync("rsa", { modulusLength: 2048 });

class BrowserJar {
  private readonly cookies = new Map<string, string>();

  async get(path: string): Promise<Response> {
    const response = await server.get(path, {
      redirect: "manual",
      headers: {
        Cookie: [...this.cookies]
          .map(([name, value]) => `${name}=${value}`)
          .join("; "),
      },
    });
    for (const cookie of cookies(response) ?? []) {
      const first = cookie.split(";")[0];
      const separator = first.indexOf("=");
      const name = first.slice(0, separator);
      const value = first.slice(separator + 1);
      if (!value) {
        this.cookies.delete(name);
      } else {
        this.cookies.set(name, value);
      }
    }
    return response;
  }
}

interface Authorization {
  nonce: string;
  challenge: string;
}

class SignedProvider {
  issuer = "";
  fault = "";
  tokenRequests = 0;
  private readonly codes = new Map<string, Authorization>();
  private readonly transport = http.createServer((request, response) => {
    void this.handle(request, response).catch(() => {
      response.writeHead(500);
      response.end();
    });
  });

  async start() {
    await new Promise<void>((resolve) =>
      this.transport.listen(0, "127.0.0.1", resolve)
    );
    this.issuer = `http://127.0.0.1:${(this.transport.address() as AddressInfo).port}/`;
  }

  callback(authorizationUrl: string): string {
    const authorization = new URL(authorizationUrl);
    const code = randomUUID();
    this.codes.set(code, {
      nonce: authorization.searchParams.get("nonce") ?? "",
      challenge:
        this.fault === "pkce"
          ? "wrong-challenge"
          : (authorization.searchParams.get("code_challenge") ?? ""),
    });
    return `/auth/oidc.callback?code=${this.fault === "code" ? randomUUID() : code}&state=${authorization.searchParams.get("state")}`;
  }

  async close() {
    this.transport.closeAllConnections();
    await new Promise<void>((resolve) => this.transport.close(() => resolve()));
  }

  private async handle(
    request: http.IncomingMessage,
    response: http.ServerResponse
  ) {
    const reply = (body: object, status = 200) => {
      response.writeHead(status, { "Content-Type": "application/json" });
      response.end(JSON.stringify(body));
    };
    if (request.url === "/.well-known/openid-configuration") {
      if (this.fault === "discovery") {
        reply({ error: "temporarily_unavailable" }, 503);
        return;
      }
      reply({
        issuer: this.issuer,
        authorization_endpoint: `${this.issuer}authorize`,
        token_endpoint: `${this.issuer}token`,
        userinfo_endpoint: `${this.issuer}userinfo`,
        jwks_uri: `${this.issuer}jwks`,
        response_types_supported: ["code"],
        subject_types_supported: ["public"],
        id_token_signing_alg_values_supported: ["RS256"],
      });
      return;
    }
    if (request.url === "/jwks") {
      reply({
        keys: [
          {
            ...keys.publicKey.export({ format: "jwk" }),
            kid: "fixture",
            use: "sig",
            alg: "RS256",
          },
        ],
      });
      return;
    }
    if (request.url === "/userinfo") {
      if (this.fault === "userinfo") {
        reply({ error: "temporarily_unavailable" }, 503);
        return;
      }
      reply({
        sub: this.fault === "subject" ? randomUUID() : subject,
        nickname: profile.nickname,
        email: profile.email,
      });
      return;
    }
    if (request.url !== "/token") {
      reply({ error: "not_found" }, 404);
      return;
    }
    this.tokenRequests += 1;
    let body = "";
    for await (const chunk of request) {
      body += String(chunk);
    }
    const parameters = new URLSearchParams(body);
    const code = parameters.get("code") ?? "";
    const authorization = this.codes.get(code);
    const verifier = parameters.get("code_verifier") ?? "";
    if (
      !authorization ||
      createHash("sha256").update(verifier).digest("base64url") !==
        authorization.challenge
    ) {
      reply({ error: "invalid_grant" }, 400);
      return;
    }
    this.codes.delete(code);
    if (this.fault === "token") {
      reply({ error: "temporarily_unavailable" }, 503);
      return;
    }
    const now = Math.floor(Date.now() / 1000);
    const claims = {
      iss: this.fault === "issuer" ? "http://wrong.test/" : this.issuer,
      aud: this.fault === "audience" ? "another-client" : "ex-outline-local",
      sub: subject,
      sid: "fixture-sid",
      ex_session_id: websiteSessionId,
      nonce: this.fault === "nonce" ? "another-nonce" : authorization.nonce,
      iat: now,
      exp: now + 60,
      nickname: profile.nickname,
      email: profile.email,
      profile_version: 1,
    };
    const data = `${Buffer.from(JSON.stringify({ alg: "RS256", kid: "fixture" })).toString("base64url")}.${Buffer.from(JSON.stringify(claims)).toString("base64url")}`;
    const signature = sign(
      "RSA-SHA256",
      Buffer.from(data),
      this.fault === "signature" ? wrongKeys.privateKey : keys.privateKey
    ).toString("base64url");
    reply({
      access_token: "fixture-access-token",
      token_type: "Bearer",
      expires_in: 60,
      id_token: `${data}.${signature}`,
    });
  }
}

let provider: SignedProvider;
beforeEach(async () => {
  provider = new SignedProvider();
  await provider.start();
  vi.stubEnv("WEBSITE_INTEGRATION_MODE", "local");
  vi.stubEnv("URL", "http://127.0.0.1:8080/docs");
  vi.stubEnv("WEBSITE_URL", "http://127.0.0.1:8080/");
  vi.stubEnv("WEBSITE_INTERNAL_URL", "http://127.0.0.1:1/");
  vi.stubEnv("HYDRA_PUBLIC_URL", provider.issuer);
  vi.stubEnv("OUTLINE_OIDC_CLIENT_ID", "ex-outline-local");
  env.URL = "http://127.0.0.1:8080/docs";
  env.WEBSITE_INTEGRATION_ENABLED = true;
  await bootstrapIntegration(subject, async () => profile);
  vi.spyOn(WebsiteIdentityClient.prototype, "check").mockResolvedValue({
    active: true,
    sessionId: websiteSessionId,
    userId: subject,
    expiresAt: Date.now() + 60_000,
    profile: {
      nickname: profile.nickname,
      email: profile.email,
      avatarUrl: null,
      version: 1,
    },
  });
});

afterEach(async () => {
  await provider.close();
  vi.unstubAllEnvs();
});

type Response = Awaited<ReturnType<typeof server.get>>;

function cookies(response: Response): string[] {
  const values = response.headers.raw();
  return values["set-cookie"] ?? [];
}

function location(response: Response): string {
  const url = new URL(
    response.headers.get("location") ?? "",
    "http://127.0.0.1"
  );
  return `${url.pathname}${url.search}${url.hash}`;
}

async function begin(browser: BrowserJar) {
  const response = await browser.get(
    `/auth/oidc?returnTo=${encodeURIComponent(returnPath)}`
  );
  expect(response.status).toBe(302);
  return {
    response,
    callback: provider.callback(response.headers.get("location") ?? ""),
  };
}

it("binds a genuine signed OIDC flow to its initiating cookie jar before consuming state", async () => {
  const initiator = new BrowserJar();
  const foreign = new BrowserJar();
  const { response, callback } = await begin(initiator);
  const bindingCookie = cookies(response).find((cookie) =>
    cookie.startsWith("exdocs_oidc_")
  );
  expect(bindingCookie).toContain("httponly");
  expect(bindingCookie).toContain("samesite=lax");
  expect(bindingCookie).toContain("path=/docs/auth");
  const rejected = await foreign.get(callback);
  expect(location(rejected)).toBe("/docs/#website-signin-unavailable");
  expect(
    cookies(rejected).some((cookie) => cookie.startsWith("exdocs_access="))
  ).toBe(false);
  expect(provider.tokenRequests).toBe(0);
  expect(await ExternalSession.count()).toBe(0);
  const accepted = await initiator.get(callback);
  expect(location(accepted)).toBe(returnPath);
  expect(
    cookies(accepted).some((cookie) => cookie.startsWith("exdocs_access="))
  ).toBe(true);
  expect(
    cookies(accepted).some((cookie) =>
      cookie.startsWith("exdocs_oidc_ex-outline-local=;")
    )
  ).toBe(true);
  expect(await ExternalSession.count()).toBe(1);
  const replayed = await initiator.get(callback);
  expect(location(replayed)).toBe("/docs/#website-signin-unavailable");
  expect(provider.tokenRequests).toBe(1);
});

it("rejects actual code nonce PKCE issuer audience signature and userinfo-subject failures", async () => {
  for (const fault of [
    "code",
    "nonce",
    "pkce",
    "issuer",
    "audience",
    "signature",
    "subject",
  ]) {
    provider.fault = fault;
    const browser = new BrowserJar();
    const { callback } = await begin(browser);
    const rejected = await browser.get(callback);
    expect(location(rejected), fault).toBe(publicFailure);
    expect(
      cookies(rejected).some((cookie) => cookie.startsWith("exdocs_access=")),
      fault
    ).toBe(false);
  }
  provider.fault = "";
  const browser = new BrowserJar();
  const { callback } = await begin(browser);
  const before = provider.tokenRequests;
  const wrongState = new URL(callback, "http://127.0.0.1");
  wrongState.searchParams.set("state", "A".repeat(43));
  const rejected = await browser.get(
    `${wrongState.pathname}${wrongState.search}`
  );
  expect(location(rejected)).toBe("/docs/#website-signin-unavailable");
  expect(provider.tokenRequests).toBe(before);
  expect(await ExternalSession.count()).toBe(0);
});

it("restores the safe public document after discovery token userinfo and provisioning outages", async () => {
  provider.fault = "discovery";
  const unavailable = await new BrowserJar().get(
    `/auth/oidc?returnTo=${encodeURIComponent(returnPath)}`
  );
  expect(location(unavailable)).toBe(publicFailure);
  expect(
    cookies(unavailable).some((cookie) => cookie.startsWith("exdocs_access="))
  ).toBe(false);
  for (const fault of ["token", "userinfo", "provisioning"]) {
    provider.fault = fault;
    if (fault === "provisioning") {
      vi.mocked(WebsiteIdentityClient.prototype.check).mockRejectedValueOnce(
        new Error("identity unavailable")
      );
    }
    const browser = new BrowserJar();
    const { callback } = await begin(browser);
    const unavailableCallback = await browser.get(callback);
    expect(location(unavailableCallback), fault).toBe(publicFailure);
    expect(
      cookies(unavailableCallback).some((cookie) =>
        cookie.startsWith("exdocs_access=")
      ),
      fault
    ).toBe(false);
  }
  expect(await ExternalSession.count()).toBe(0);
  const untrusted = await new BrowserJar().get(
    "/auth/oidc.callback?code=untrusted&state=evil"
  );
  expect(location(untrusted)).toBe("/docs/#website-signin-unavailable");
});
