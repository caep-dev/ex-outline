import { createDecipheriv, createHash, timingSafeEqual } from "node:crypto";
import Koa from "koa";
import bodyParser from "koa-body";
import Router from "koa-router";
import isUUID from "validator/lib/isUUID";
import env from "@server/env";
import { websiteIntegrationConfig } from "@server/identity/config";
import { revokeWebsiteAccessToken } from "@server/identity/websiteOidc";
import { websiteSessionGuard } from "@server/identity/authenticateExternalSession";
import { ExternalIdentity, ExternalSession } from "@server/models";
import { sequelize } from "@server/storage/database";
import RedisAdapter from "@server/storage/redis";

const app = new Koa();
const router = new Router();
export const revocationChannel = "website-identity:revoked";

function validKey(supplied: string): boolean {
  const expected = process.env.IDENTITY_DELIVERY_KEY;
  if (
    !expected ||
    !/^[0-9a-f]{64}$/i.test(expected) ||
    !/^[0-9a-f]{64}$/i.test(supplied)
  ) {
    return false;
  }
  return timingSafeEqual(
    createHash("sha256").update(expected).digest(),
    createHash("sha256").update(supplied).digest()
  );
}

function unsealAccessToken(value: string): string {
  const bytes = Buffer.from(value, "base64url");
  if (bytes.length < 29) {
    throw new Error("Stored access token is invalid");
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    Buffer.from(env.SECRET_KEY, "hex"),
    bytes.subarray(0, 12)
  );
  decipher.setAuthTag(bytes.subarray(12, 28));
  return Buffer.concat([
    decipher.update(bytes.subarray(28)),
    decipher.final(),
  ]).toString("utf8");
}

router.post("/revoke", async (ctx) => {
  if (!env.WEBSITE_INTEGRATION_ENABLED) {
    ctx.status = 404;
    return;
  }
  ctx.set("Cache-Control", "no-store");
  if (!validKey(ctx.get("X-Identity-Delivery-Key"))) {
    ctx.status = 401;
    return;
  }
  const body = ctx.request.body as
    | { eventId?: unknown; sessionId?: unknown; userId?: unknown }
    | undefined;
  const eventId = body?.eventId;
  const sessionId = body?.sessionId;
  const userId = body?.userId;
  if (
    typeof eventId !== "string" ||
    !isUUID(eventId, 4) ||
    (typeof sessionId === "string") === (typeof userId === "string") ||
    (sessionId !== undefined &&
      (typeof sessionId !== "string" || !isUUID(sessionId, 4))) ||
    (userId !== undefined && (typeof userId !== "string" || !isUUID(userId, 4)))
  ) {
    ctx.status = 400;
    return;
  }
  const outlineUserId = userId
    ? (
        await ExternalIdentity.findOne({
          where: {
            issuer: websiteIntegrationConfig().issuer,
            subject: userId,
          },
        })
      )?.userId
    : undefined;
  await sequelize.transaction(async (transaction) => {
    await sequelize.query(
      `INSERT INTO external_revocation_events ("eventId", "createdAt")
      VALUES (:eventId, NOW()) ON CONFLICT ("eventId") DO NOTHING`,
      { replacements: { eventId }, transaction }
    );
    if (sessionId || outlineUserId) {
      await ExternalSession.update(
        { revokedAt: new Date() },
        {
          where: sessionId
            ? {
                websiteSessionId: sessionId,
                clientId: websiteIntegrationConfig().clientId,
              }
            : {
                userId: outlineUserId,
                clientId: websiteIntegrationConfig().clientId,
              },
          transaction,
        }
      );
    }
  });
  websiteSessionGuard().invalidate(
    sessionId ? { sessionId } : { userId: outlineUserId }
  );
  await RedisAdapter.defaultClient.publish(
    revocationChannel,
    JSON.stringify({ eventId, sessionId, userId: outlineUserId })
  );
  const sessions =
    sessionId || outlineUserId
      ? await ExternalSession.findAll({
          where: sessionId
            ? { websiteSessionId: sessionId }
            : { userId: outlineUserId },
        })
      : [];
  for (const session of sessions) {
    if (!session.encryptedAccessToken) {
      continue;
    }
    await revokeWebsiteAccessToken(
      unsealAccessToken(session.encryptedAccessToken)
    );
    await session.update({ encryptedAccessToken: null });
  }
  ctx.body = { accepted: true };
});

app.use(bodyParser());
app.use(router.routes());
export default app;
