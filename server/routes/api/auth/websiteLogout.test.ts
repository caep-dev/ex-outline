import { randomUUID } from "node:crypto";
import { CSRF } from "@shared/constants";
import env from "@server/env";
import WebsiteIdentityClient from "@server/identity/WebsiteIdentityClient";
import { issueExternalSessionToken } from "@server/identity/authenticateExternalSession";
import { ExternalIdentity, ExternalSession } from "@server/models";
import { buildAdmin, buildTeam } from "@server/test/factories";
import { getTestServer } from "@server/test/support";
import { bundleToken, generateRawToken } from "@server/utils/csrf";

const server = getTestServer();

it("revokes the verified Website subject and only the selected browser session", async () => {
  env.WEBSITE_INTEGRATION_ENABLED = true;
  process.env.HYDRA_PUBLIC_URL = "http://identity.exwebsite.test:8090/";
  process.env.WEBSITE_INTERNAL_URL = "http://127.0.0.1:18766/";
  process.env.OUTLINE_INTEGRATION_KEY = "isolated-test-key";
  const team = await buildTeam();
  const user = await buildAdmin({ teamId: team.id });
  const subject = randomUUID();
  expect(subject).not.toBe(user.id);
  await ExternalIdentity.create({
    issuer: process.env.HYDRA_PUBLIC_URL,
    subject,
    userId: user.id,
  });
  const selectedWebsiteSessionId = randomUUID();
  const selected = await ExternalSession.create({
    userId: user.id,
    websiteSessionId: selectedWebsiteSessionId,
    hydraSid: "logout-selected-sid",
    clientId: "ex-outline",
    expiresAt: new Date(Date.now() + 60_000),
  });
  const other = await ExternalSession.create({
    userId: user.id,
    websiteSessionId: randomUUID(),
    hydraSid: "logout-other-sid",
    clientId: "ex-outline",
    expiresAt: new Date(Date.now() + 60_000),
  });
  vi.spyOn(WebsiteIdentityClient.prototype, "check").mockImplementation(
    async (sid) => ({
      active: true,
      sessionId:
        sid === selected.hydraSid
          ? selectedWebsiteSessionId
          : other.websiteSessionId,
      userId: subject,
      expiresAt: Date.now() + 60_000,
      profile: {
        nickname: user.name,
        email: user.email!,
        avatarUrl: null,
        version: 0,
      },
    })
  );
  const revoke = vi
    .spyOn(WebsiteIdentityClient.prototype, "revoke")
    .mockResolvedValue();
  const csrf = bundleToken(generateRawToken(16), env.SECRET_KEY);
  for (const [origin, suppliedCsrf] of [
    ["http://sibling.exwebsite.test:8090", csrf],
    [new URL(env.URL).origin, ""],
  ]) {
    const forbidden = await server.post("/api/auth.delete", {
      body: {},
      headers: {
        Cookie: `exdocs_access=${issueExternalSessionToken(selected)}; ${CSRF.cookieName}=${csrf}`,
        [CSRF.headerName]: suppliedCsrf,
        Origin: origin,
      },
    });
    expect(forbidden.status).toBe(403);
  }
  expect(revoke).not.toHaveBeenCalled();
  const response = await server.post("/api/auth.delete", {
    body: {},
    headers: {
      Cookie: `exdocs_access=${issueExternalSessionToken(selected)}; ${CSRF.cookieName}=${csrf}`,
      [CSRF.headerName]: csrf,
      Origin: new URL(env.URL).origin,
    },
  });
  expect(response.status).toBe(200);
  expect(revoke).toHaveBeenCalledWith(selected.hydraSid, subject);
  await selected.reload();
  await other.reload();
  expect(selected.revokedAt).not.toBeNull();
  expect(other.revokedAt).toBeNull();

  revoke.mockRejectedValueOnce(new Error("Website unavailable"));
  const failure = await server.post("/api/auth.delete", {
    body: {},
    headers: {
      Cookie: `exdocs_access=${issueExternalSessionToken(other)}; ${CSRF.cookieName}=${csrf}`,
      [CSRF.headerName]: csrf,
      Origin: new URL(env.URL).origin,
    },
  });
  expect(failure.status).not.toBe(200);
  expect(failure.headers.get("set-cookie") ?? "").not.toContain(
    "exdocs_access="
  );
  await other.reload();
  expect(other.revokedAt).toBeNull();
});
