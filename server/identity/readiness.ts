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
 * Explains startup failures using known codes without exposing database messages or credentials.
 *
 * @param error the failed startup check.
 * @returns a safe explanation and the explicit corrective step.
 */
export function integrationReadinessFailure(error: unknown): string {
  const failures: Record<string, [string, string]> = {
    INTEGRATION_DATABASE_IDENTITY_MISMATCH: [
      "Outline 数据库身份不正确",
      "核对 OUTLINE_DATABASE_NAME=outline 和独立 owner",
    ],
    INTEGRATION_MIGRATIONS_REQUIRED: [
      "Outline migration 未完成",
      "对现有 Outline 数据库显式执行 pnpm infra migrate",
    ],
    INTEGRATION_STRUCTURE_INCOMPLETE: [
      "Outline 必需表或列缺失",
      "显式执行 pnpm infra migrate；手工修改过的结构先核对迁移记录",
    ],
    INTEGRATION_BOOTSTRAP_REQUIRED_OR_CONFLICT: [
      "Outline 身份未准备或与当前 issuer/管理员选择冲突",
      "核对 HYDRA_PUBLIC_URL 和已有身份；未准备时选择已有 active Website 用户 UUID，再执行 pnpm infra bootstrap --admin-user-id <UUID>",
    ],
    INTEGRATION_WORKSPACE_INCOMPLETE: [
      "Outline 工作区、初始账号或认证关联缺失/停用",
      "核对现有工作区和账号关联，保留原用户与权限；不要通过重复 bootstrap 恢复已撤销权限",
    ],
    INTEGRATION_CHECK_ADMIN_REQUIRED: [
      "Outline 检查参数中的管理员 UUID 无效",
      "使用 --admin-user-id <已有 active Website 用户 UUID>",
    ],
    INTEGRATION_PREPARATION_INVALID: [
      "Outline 文档身份配置无效",
      "核对 WEBSITE_INTEGRATION_ENABLED 和管理员 UUID",
    ],
  };
  const message = error instanceof Error ? error.message : "";
  const failure = failures[message];
  if (failure) {
    return `${message}；检查项：${failure[0]}；下一步：${failure[1]}`;
  }
  if (
    /^INTEGRATION_(?:MODE_INVALID|LAYOUT_CONFLICT|LOCAL_ADDRESS_INVALID|LOCAL_PORT_CONFLICT|DEPLOYMENT_LAYOUT_CONFLICT|LEGACY_LAYOUT_CONFLICT|ADDRESS_MISSING|ADDRESS_INVALID)$/.test(
      message
    )
  ) {
    return `${message}；检查项：Outline 身份服务地址或运行模式无效；下一步：核对 HYDRA_PUBLIC_URL、HYDRA_ADMIN_URL、PUBLIC_ORIGIN 和 WEBSITE_INTEGRATION_MODE`;
  }
  const source = error as {
    original?: { code?: string };
    parent?: { code?: string };
    code?: string;
  };
  const code = source?.original?.code ?? source?.parent?.code ?? source?.code;
  const reasons: Record<string, string> = {
    "28P01": "数据库认证失败",
    "3D000": "数据库不存在",
    "42P01": "必需表或 migration 缺失",
    "42703": "必需列缺失",
    ECONNREFUSED: "数据库连接被拒绝",
    ENOTFOUND: "数据库主机无法解析",
    ETIMEDOUT: "数据库连接超时",
  };
  if (code && reasons[code]) {
    return `OUTLINE_DATABASE_${code}；检查项：${reasons[code]}；配置键：OUTLINE_DATABASE_HOST、OUTLINE_DATABASE_PORT、OUTLINE_DATABASE_NAME、OUTLINE_DATABASE_USER、OUTLINE_DATABASE_PASSWORD；下一步：核对连接配置和目标服务；结构缺失时显式 pnpm infra migrate`;
  }
  return "OUTLINE_CHECK_FAILED；检查项：Outline 启动检查未通过，无法确定具体原因；下一步：核对 Outline 服务日志和数据库结构；原始异常已隐藏";
}

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
