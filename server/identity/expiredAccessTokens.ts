import { Op } from "sequelize";
import { ExternalSession } from "@server/models";

const ACCESS_TOKEN_LIFETIME_MS = 60_000;

/** OIDC access tokens are capped at 60 seconds; keep no ciphertext after that window. */
export async function clearExpiredWebsiteAccessTokens(
  now = new Date()
): Promise<void> {
  await ExternalSession.update(
    { encryptedAccessToken: null },
    {
      where: {
        encryptedAccessToken: { [Op.ne]: null },
        createdAt: {
          [Op.lte]: new Date(now.getTime() - ACCESS_TOKEN_LIFETIME_MS),
        },
      },
    }
  );
}

export function startExpiredWebsiteAccessTokenCleanup(): void {
  let busy = false;
  setInterval(() => {
    if (busy) {
      return;
    }
    busy = true;
    void clearExpiredWebsiteAccessTokens()
      .catch(() => undefined)
      .finally(() => {
        busy = false;
      });
  }, 30_000).unref();
}
