import { randomUUID } from "node:crypto";
import env from "@server/env";
import { User, WebsiteIntegration } from "@server/models";
import { buildTeam } from "@server/test/factories";
import WebsiteIdentityClient from "./WebsiteIdentityClient";
import { provisionWebsiteSession } from "./websiteProvisioner";
import type { VerifiedWebsiteIdentity } from "./websiteOidc";

vi.mock("./config", () => ({
  websiteIntegrationConfig: () => ({
    issuer: "http://127.0.0.1:1/",
    clientId: "isolated-outline-test-client",
  }),
}));

it("creates integrated users in Chinese and preserves saved English on profile refresh", async () => {
  expect(env.DEFAULT_LANGUAGE).toBe("zh_CN");
  const issuer = "http://127.0.0.1:1/";
  const team = await buildTeam({
    authenticationProviders: [{ name: "website", providerId: issuer }],
  });
  const subject = randomUUID();
  await WebsiteIntegration.create({
    key: "website",
    teamId: team.id,
    issuer,
    initialAdminSubject: subject,
  });
  const identity: VerifiedWebsiteIdentity = {
    subject,
    sid: randomUUID(),
    websiteSessionId: randomUUID(),
    nickname: "Reader",
    email: "reader@example.test",
    picture: null,
    profileVersion: 1,
    expiresAt: new Date(Date.now() + 60000),
    accessToken: "isolated-access-token",
    returnPath: "/docs/",
  };
  const client = new WebsiteIdentityClient(
    "http://127.0.0.1:1/",
    "isolated-test-key"
  );
  vi.spyOn(client, "check").mockResolvedValue({
    active: true,
    sessionId: identity.websiteSessionId,
    userId: subject,
    expiresAt: identity.expiresAt.getTime(),
    profile: {
      nickname: identity.nickname,
      email: identity.email,
      avatarUrl: null,
      version: 1,
    },
  });
  const create = vi.spyOn(User, "create");
  const session = await provisionWebsiteSession(identity, client);
  expect(create.mock.calls[0][0]).toMatchObject({ language: "zh_CN" });
  const user = await User.findByPk(session.userId, { rejectOnEmpty: true });
  expect(user.language).toBe("zh_CN");
  await user.update({ language: "en_US" });
  await provisionWebsiteSession(
    { ...identity, profileVersion: 2, nickname: "Updated reader" },
    client
  );
  await user.reload();
  expect(user.name).toBe("Updated reader");
  expect(user.language).toBe("en_US");
  create.mockRestore();
});
