import { QueryTypes } from "sequelize";
import isUUID from "validator/lib/isUUID";
import { z } from "zod";
import { CommentingAccess, TeamPreference, UserRole } from "@shared/types";
import env from "@server/env";
import { websiteIntegrationConfig } from "@server/identity/config";
import {
  AuthenticationProvider,
  ExternalIdentity,
  Team,
  User,
  UserAuthentication,
  WebsiteIntegration,
} from "@server/models";
import { sequelize } from "@server/storage/database";

/**
 * Initializes the fixed integration workspace through an explicit operator command.
 *
 * @param subject the verified Website account UUID.
 * @param inspect the active-account inspection callback.
 * @returns the fixed workspace and administrator identifiers.
 * @throws if initialization conflicts with existing state or the account is inactive.
 */
export async function bootstrapIntegration(
  subject: string,
  inspect: () => Promise<z.infer<typeof ProfileSchema>>
) {
  if (!env.WEBSITE_INTEGRATION_ENABLED || !isUUID(subject)) {
    throw new Error(
      "Explicit integration mode and a valid Website account are required"
    );
  }
  const { issuer } = websiteIntegrationConfig();
  const profile = ProfileSchema.parse(await inspect());
  if (profile.id !== subject) {
    throw new Error("Website account identity mismatch");
  }
  return sequelize.transaction(async (transaction) => {
    await sequelize.query("SELECT pg_advisory_xact_lock(19650330, 8090)", {
      transaction,
    });
    const marker = await WebsiteIntegration.findByPk("website", {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (marker) {
      if (marker.issuer !== issuer || marker.initialAdminSubject !== subject) {
        throw new Error(
          "Workspace initialization conflicts with the existing administrator or issuer"
        );
      }
      const identity = await ExternalIdentity.findOne({
        where: { issuer, subject },
        transaction,
      });
      const team = await Team.findByPk(marker.teamId, { transaction });
      const admin =
        identity && (await User.findByPk(identity.userId, { transaction }));
      if (!team || !admin || admin.teamId !== marker.teamId) {
        throw new Error(
          "Existing integration state is incomplete; explicit repair is required"
        );
      }
      const current = ProfileSchema.parse(await inspect());
      if (current.id !== subject) {
        throw new Error("Website account identity mismatch");
      }
      return { teamId: marker.teamId, userId: admin.id, initialized: false };
    }
    if ((await Team.count({ paranoid: false, transaction })) !== 0) {
      throw new Error(
        "Integration bootstrap requires an empty Outline workspace database"
      );
    }
    const team = await Team.create(
      {
        name: "Docs",
        subdomain: "website-docs",
        sharing: true,
        defaultUserRole: UserRole.Viewer,
        memberCollectionCreate: false,
        memberTeamCreate: false,
        inviteRequired: true,
        guestSignin: false,
        passkeysEnabled: false,
        preferences: {
          [TeamPreference.MCP]: false,
          [TeamPreference.MembersCanCreateApiKey]: false,
          [TeamPreference.Commenting]: CommentingAccess.Members,
        },
      },
      { transaction }
    );
    const provider = await AuthenticationProvider.create(
      { teamId: team.id, name: "website", providerId: issuer, enabled: true },
      { transaction }
    );
    const user = await User.create(
      {
        teamId: team.id,
        name: profile.nickname,
        email: profile.email,
        avatarUrl: profile.avatarUrl,
        role: UserRole.Admin,
        lastActiveAt: new Date(),
      },
      { transaction }
    );
    await UserAuthentication.create(
      {
        userId: user.id,
        authenticationProviderId: provider.id,
        providerId: subject,
        scopes: ["openid", "profile", "email"],
      },
      { transaction }
    );
    await ExternalIdentity.create(
      {
        issuer,
        subject,
        userId: user.id,
        profileVersion: profile.profileVersion,
      },
      { transaction }
    );
    await WebsiteIntegration.create(
      { key: "website", teamId: team.id, issuer, initialAdminSubject: subject },
      { transaction }
    );
    const current = ProfileSchema.parse(await inspect());
    if (current.id !== subject) {
      throw new Error("Website account identity mismatch");
    }
    await user.update(
      {
        name: current.nickname,
        email: current.email,
        avatarUrl: current.avatarUrl,
      },
      { transaction }
    );
    await ExternalIdentity.update(
      { profileVersion: current.profileVersion },
      { where: { issuer, subject }, transaction }
    );
    return { teamId: team.id, userId: user.id, initialized: true };
  });
}

const ProfileSchema = z
  .object({
    id: z.uuid(),
    nickname: z.string().min(1).max(32),
    email: z.email(),
    avatarUrl: z.string().nullable(),
    profileVersion: z.number().int().min(0),
  })
  .strict();

async function main() {
  const args = process.argv.slice(2);
  if (args.length !== 2 || args[0] !== "--admin-user-id" || !isUUID(args[1])) {
    throw new Error(
      "Usage: integration:bootstrap --admin-user-id <Website UUID>"
    );
  }
  const subject = args[1];
  const internalBase = new URL(websiteIntegrationConfig().websiteInternalUrl);
  const key = process.env.IDENTITY_BOOTSTRAP_KEY;
  if (
    !["http:", "https:"].includes(internalBase.protocol) ||
    internalBase.pathname !== "/" ||
    internalBase.username ||
    internalBase.password ||
    internalBase.search ||
    internalBase.hash ||
    !key
  ) {
    throw new Error(
      "Bootstrap internal Website endpoint or key is missing or invalid"
    );
  }
  const database = await sequelize.query<{ name: string }>(
    "SELECT current_database() AS name",
    { type: QueryTypes.SELECT }
  );
  if (database[0]?.name !== "outline") {
    throw new Error("Bootstrap database identity mismatch");
  }
  await WebsiteIntegration.count();
  const result = await bootstrapIntegration(subject, async () => {
    const response = await fetch(
      new URL("/api/internal/identity/user/inspect", internalBase),
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Bootstrap-Key": key },
        body: JSON.stringify({ userId: subject }),
        signal: AbortSignal.timeout(1000),
      }
    );
    if (!response.ok) {
      throw new Error("Website account inspection failed");
    }
    return ProfileSchema.parse(await response.json());
  });
  // Identifiers are operator output; do not print profiles, tokens, or keys.
  // oxlint-disable-next-line no-console
  console.log(JSON.stringify(result));
}

if (require.main === module) {
  void main().then(
    async () => {
      await sequelize.close();
      process.exitCode = 0;
    },
    async () => {
      // Do not expose transport exceptions or SQL connection details.
      // oxlint-disable-next-line no-console
      console.error(
        "Integration bootstrap failed; verify migrations, active account, and fixed initialization parameters"
      );
      await sequelize.close();
      process.exitCode = 1;
    }
  );
}
