import fs from "node:fs";
import path from "node:path";
import { DataTypes, QueryTypes } from "sequelize";
import isUUID from "validator/lib/isUUID";
import env from "@server/env";
import {
  AuthenticationProvider,
  ExternalIdentity,
  Team,
  User,
  UserAuthentication,
  WebsiteIntegration,
} from "@server/models";
import { sequelize } from "@server/storage/database";
import { websiteIntegrationConfig } from "./config";

/**
 * Refuses native authentication when an existing workspace carries an integration marker.
 *
 * @returns when the authentication mode is safe for the selected workspace.
 * @throws if integration is disabled for a marked workspace.
 */
export async function assertIntegrationModeSafe(): Promise<void> {
  if (env.WEBSITE_INTEGRATION_ENABLED) {
    websiteIntegrationConfig();
    return;
  }
  const tables = await sequelize.query<{ present: boolean }>(
    "SELECT to_regclass('website_integrations') IS NOT NULL AS present",
    { type: QueryTypes.SELECT }
  );
  if (tables[0]?.present && (await WebsiteIntegration.count())) {
    throw new Error("INTEGRATION_CANNOT_BE_DISABLED");
  }
}

/**
 * Checks the real database, migrations, model columns and fixed workspace in a read-only transaction.
 *
 * @param adminSubject the explicitly configured initial Website administrator, if supplied.
 * @returns the verified workspace identifiers without account profiles or credentials.
 * @throws if any preparation stage or integration identity conflicts with the current configuration.
 */
export async function assertIntegrationReady(adminSubject?: string) {
  const config = websiteIntegrationConfig();
  if (
    !env.WEBSITE_INTEGRATION_ENABLED ||
    (adminSubject && !isUUID(adminSubject))
  ) {
    throw new Error("INTEGRATION_PREPARATION_INVALID");
  }
  return sequelize.transaction({ readOnly: true }, async (transaction) => {
    await sequelize.query("SET TRANSACTION READ ONLY", { transaction });
    const database = await sequelize.query<{ name: string }>(
      "SELECT current_database() AS name",
      { type: QueryTypes.SELECT, transaction }
    );
    if (database[0]?.name !== "outline") {
      throw new Error("INTEGRATION_DATABASE_IDENTITY_MISMATCH");
    }
    const columns = await sequelize.query<{
      table_name: string;
      column_name: string;
    }>(
      "SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = current_schema()",
      { type: QueryTypes.SELECT, transaction }
    );
    const actual = new Set(
      columns.map((column) => `${column.table_name}.${column.column_name}`)
    );
    if (!actual.has("SequelizeMeta.name")) {
      throw new Error("INTEGRATION_MIGRATIONS_REQUIRED");
    }
    const executed = await sequelize.query<{ name: string }>(
      'SELECT name FROM "SequelizeMeta"',
      { type: QueryTypes.SELECT, transaction }
    );
    const names = new Set(executed.map((migration) => migration.name));
    const required = fs
      .readdirSync(path.resolve("server/migrations"))
      .filter((name) => name.endsWith(".js"));
    if (required.some((name) => !names.has(name))) {
      throw new Error("INTEGRATION_MIGRATIONS_REQUIRED");
    }
    for (const model of Object.values(sequelize.models)) {
      const table = model.getTableName();
      const tableName = typeof table === "string" ? table : table.tableName;
      for (const [name, attribute] of Object.entries(model.getAttributes())) {
        if (attribute.type instanceof DataTypes.VIRTUAL) {
          continue;
        }
        if (!actual.has(`${tableName}.${attribute.field ?? name}`)) {
          throw new Error("INTEGRATION_STRUCTURE_INCOMPLETE");
        }
      }
    }
    if (
      !actual.has("external_revocation_events.eventId") ||
      !actual.has("external_revocation_events.createdAt")
    ) {
      throw new Error("INTEGRATION_STRUCTURE_INCOMPLETE");
    }
    const marker = await WebsiteIntegration.findByPk("website", {
      transaction,
    });
    if (
      !marker ||
      marker.issuer !== config.issuer ||
      (adminSubject && marker.initialAdminSubject !== adminSubject)
    ) {
      throw new Error("INTEGRATION_BOOTSTRAP_REQUIRED_OR_CONFLICT");
    }
    const identity = await ExternalIdentity.findOne({
      where: { issuer: config.issuer, subject: marker.initialAdminSubject },
      transaction,
    });
    const admin =
      identity && (await User.findByPk(identity.userId, { transaction }));
    const team = await Team.findByPk(marker.teamId, { transaction });
    const provider = await AuthenticationProvider.findOne({
      where: {
        teamId: marker.teamId,
        name: "website",
        providerId: config.issuer,
        enabled: true,
      },
      transaction,
    });
    const authentication =
      admin &&
      provider &&
      (await UserAuthentication.findOne({
        where: {
          userId: admin.id,
          authenticationProviderId: provider.id,
          providerId: marker.initialAdminSubject,
        },
        transaction,
      }));
    if (
      !team ||
      !admin ||
      admin.teamId !== marker.teamId ||
      admin.suspendedAt ||
      !authentication
    ) {
      throw new Error("INTEGRATION_WORKSPACE_INCOMPLETE");
    }
    return {
      teamId: marker.teamId,
      userId: admin.id,
      issuer: config.issuer,
      clientId: config.clientId,
    };
  });
}
