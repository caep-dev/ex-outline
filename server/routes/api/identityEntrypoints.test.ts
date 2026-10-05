import { randomUUID } from "node:crypto";
import { CSRF } from "@shared/constants";
import env from "@server/env";
import WebsiteIdentityClient from "@server/identity/WebsiteIdentityClient";
import { issueExternalSessionToken } from "@server/identity/authenticateExternalSession";
import { ExternalIdentity, ExternalSession, Team, User } from "@server/models";
import { buildAdmin, buildTeam } from "@server/test/factories";
import { getTestServer } from "@server/test/support";
import { bundleToken, generateRawToken } from "@server/utils/csrf";

env.WEBSITE_INTEGRATION_ENABLED = true;
env.ENVIRONMENT = "development";
const server = getTestServer();

it("closes independent identity and workspace creation routes in Website mode", async () => {
  const emptyInstall = await server.post("/api/installation.create", {
    body: {
      teamName: "Claimed",
      userName: "Claimed",
      userEmail: "claim@example.test",
    },
    redirect: "manual",
  });
  expect(emptyInstall.status).toBe(404);
  expect(await Team.count()).toBe(0);

  const team = await buildTeam();
  const admin = await buildAdmin({ teamId: team.id });
  const websiteSessionId = randomUUID();
  const subject = randomUUID();
  process.env.HYDRA_PUBLIC_URL = "http://identity.exwebsite.test:8090/";
  process.env.WEBSITE_INTERNAL_URL = "http://127.0.0.1:18766/";
  process.env.OUTLINE_INTEGRATION_KEY = "isolated-test-key";
  await ExternalIdentity.create({
    issuer: process.env.HYDRA_PUBLIC_URL,
    subject,
    userId: admin.id,
  });
  const session = await ExternalSession.create({
    userId: admin.id,
    websiteSessionId,
    hydraSid: "entrypoint-test-sid",
    clientId: "ex-outline",
    expiresAt: new Date(Date.now() + 60_000),
  });
  vi.spyOn(WebsiteIdentityClient.prototype, "check").mockResolvedValue({
    active: true,
    sessionId: websiteSessionId,
    userId: subject,
    expiresAt: Date.now() + 60_000,
    profile: {
      nickname: admin.name,
      email: admin.email!,
      avatarUrl: null,
      version: 0,
    },
  });
  const csrf = bundleToken(generateRawToken(16), env.SECRET_KEY);
  const headers = {
    Cookie: `exdocs_access=${issueExternalSessionToken(session)}; ${CSRF.cookieName}=${csrf}`,
    [CSRF.headerName]: csrf,
    Origin: new URL(env.URL).origin,
  };
  const initialUserCount = await User.count();
  const initialTeamCount = await Team.count();
  for (const [route, body] of [
    ["developer.create_test_users", { count: 1 }],
    [
      "users.invite",
      {
        invites: [
          { email: "extra@example.test", name: "Extra", role: "member" },
        ],
      },
    ],
    ["users.resendInvite", { id: admin.id }],
    ["teams.create", { name: "Another workspace" }],
  ] as const) {
    const response = await server.post(`/api/${route}`, { body, headers });
    expect(response.status).toBe(404);
  }
  expect(await User.count()).toBe(initialUserCount);
  expect(await Team.count()).toBe(initialTeamCount);
});
