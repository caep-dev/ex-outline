import { createCipheriv, randomBytes } from "node:crypto";
import { UniqueConstraintError } from "sequelize";
import { UserRole } from "@shared/types";
import env from "@server/env";
import {
  AuthenticationProvider,
  ExternalIdentity,
  ExternalSession,
  Team,
  User,
  UserAuthentication,
  WebsiteIntegration,
} from "@server/models";
import { sequelize } from "@server/storage/database";
import type WebsiteIdentityClient from "./WebsiteIdentityClient";
import type { VerifiedWebsiteIdentity } from "./websiteOidc";

import { websiteIntegrationConfig } from "./config";

function sealAccessToken(token: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(
    "aes-256-gcm",
    Buffer.from(env.SECRET_KEY, "hex"),
    iv
  );
  const encrypted = Buffer.concat([
    cipher.update(token, "utf8"),
    cipher.final(),
  ]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString(
    "base64url"
  );
}

/** Provisions only into the explicitly bootstrapped workspace after a live Website check. */
export async function provisionWebsiteSession(
  identity: VerifiedWebsiteIdentity,
  client: WebsiteIdentityClient
): Promise<ExternalSession> {
  const { issuer, clientId } = websiteIntegrationConfig();
  const marker = await WebsiteIntegration.findByPk("website");
  if (!marker || marker.issuer !== issuer) {
    throw new Error("Docs workspace is not initialized");
  }
  const firstCheck = await client.check(identity.sid, identity.subject);
  if (
    !firstCheck.active ||
    firstCheck.sessionId !== identity.websiteSessionId ||
    firstCheck.userId !== identity.subject ||
    firstCheck.expiresAt <= Date.now()
  ) {
    throw new Error("Website session is inactive");
  }
  const provider = await AuthenticationProvider.findOne({
    where: { teamId: marker.teamId, name: "website", providerId: issuer },
  });
  const team = await Team.findByPk(marker.teamId);
  if (!provider || !team) {
    throw new Error("Docs workspace is incomplete");
  }

  const create = async () =>
    sequelize.transaction(async (transaction) => {
      let external = await ExternalIdentity.findOne({
        where: { issuer, subject: identity.subject },
        transaction,
      });
      let user =
        external && (await User.findByPk(external.userId, { transaction }));
      if (external && (!user || user.teamId !== team.id)) {
        throw new Error("Identity mapping is invalid");
      }
      if (!user) {
        const emailOwner = await User.findOne({
          where: { email: identity.email },
          transaction,
        });
        if (emailOwner) {
          throw new Error(
            "Email is already in use; administrator resolution is required"
          );
        }
        user = await User.create(
          {
            teamId: team.id,
            name: identity.nickname,
            email: identity.email,
            avatarUrl: identity.picture,
            role: UserRole.Viewer,
            lastActiveAt: new Date(),
          },
          { transaction }
        );
        await UserAuthentication.create(
          {
            userId: user.id,
            authenticationProviderId: provider.id,
            providerId: identity.subject,
            scopes: ["openid", "profile", "email"],
          },
          { transaction }
        );
        external = await ExternalIdentity.create(
          {
            issuer,
            subject: identity.subject,
            userId: user.id,
            profileVersion: identity.profileVersion,
          },
          { transaction }
        );
      } else if (
        external &&
        identity.profileVersion >= external.profileVersion
      ) {
        // Row lock prevents an older callback from overwriting a newer profile.
        external = await ExternalIdentity.findByPk(external.id, {
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        if (external && identity.profileVersion >= external.profileVersion) {
          const emailOwner = await User.findOne({
            where: { email: identity.email },
            transaction,
          });
          if (emailOwner && emailOwner.id !== user.id) {
            throw new Error(
              "Email is already in use; administrator resolution is required"
            );
          }
          await user.update(
            {
              name: identity.nickname,
              email: identity.email,
              avatarUrl: identity.picture,
            },
            { transaction }
          );
          await external.update(
            { profileVersion: identity.profileVersion },
            { transaction }
          );
        }
      }

      const current = await client.check(identity.sid, identity.subject);
      if (
        !current.active ||
        current.sessionId !== identity.websiteSessionId ||
        current.userId !== identity.subject ||
        current.expiresAt <= Date.now()
      ) {
        throw new Error("Website session became inactive");
      }
      return ExternalSession.create(
        {
          userId: user.id,
          websiteSessionId: current.sessionId,
          hydraSid: identity.sid,
          clientId,
          expiresAt: new Date(current.expiresAt),
          encryptedAccessToken: sealAccessToken(identity.accessToken),
        },
        { transaction }
      );
    });

  try {
    return await create();
  } catch (error) {
    if (!(error instanceof UniqueConstraintError)) {
      throw error;
    }
    // The uniqueness winner may have committed in a concurrent callback.
    const winner = await ExternalIdentity.findOne({
      where: { issuer, subject: identity.subject },
    });
    if (!winner) {
      throw error;
    }
    return create();
  }
}
