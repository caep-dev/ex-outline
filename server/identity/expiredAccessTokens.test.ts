import { randomUUID } from "node:crypto";
import { ExternalSession } from "@server/models";
import { buildUser } from "@server/test/factories";
import { clearExpiredWebsiteAccessTokens } from "./expiredAccessTokens";

it("removes encrypted access tokens after their 60 second lifetime while keeping current tokens", async () => {
  const user = await buildUser();
  const now = new Date();
  const old = await ExternalSession.create(
    {
      userId: user.id,
      websiteSessionId: randomUUID(),
      hydraSid: "old",
      clientId: "ex-outline",
      expiresAt: new Date(now.getTime() + 60_000),
      encryptedAccessToken: "old-ciphertext",
      createdAt: new Date(now.getTime() - 61_000),
      updatedAt: now,
    },
    { silent: true }
  );
  const recent = await ExternalSession.create(
    {
      userId: user.id,
      websiteSessionId: randomUUID(),
      hydraSid: "recent",
      clientId: "ex-outline",
      expiresAt: new Date(now.getTime() + 60_000),
      encryptedAccessToken: "recent-ciphertext",
      createdAt: now,
      updatedAt: now,
    },
    { silent: true }
  );
  await clearExpiredWebsiteAccessTokens(now);
  expect(
    (await ExternalSession.findByPk(old.id))?.encryptedAccessToken
  ).toBeNull();
  expect(
    (await ExternalSession.findByPk(recent.id))?.encryptedAccessToken
  ).toBe("recent-ciphertext");
});
