import { execFile } from "node:child_process";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { promisify } from "node:util";
import { QueryTypes } from "sequelize";
import { sequelize } from "@server/storage/database";

const runFile = promisify(execFile);
const subject = randomUUID();
const profile = {
  id: subject,
  nickname: "Readiness administrator",
  email: "readiness@example.test",
  avatarUrl: null,
  profileVersion: 1,
};
let inspectServer: http.Server;
let childEnvironment: NodeJS.ProcessEnv;
let inspections = 0;

beforeEach(async () => {
  const identity = await sequelize.query<{ name: string }>(
    "SELECT current_database() AS name",
    { type: QueryTypes.SELECT }
  );
  expect(identity[0].name).toBe("outline");
  inspectServer = http.createServer((request, response) => {
    if (
      request.url !== "/api/internal/identity/user/inspect" ||
      request.method !== "POST" ||
      request.headers["x-bootstrap-key"] !== "a".repeat(64)
    ) {
      response.writeHead(403);
      response.end();
      return;
    }
    inspections += 1;
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify(profile));
  });
  await new Promise<void>((resolve) =>
    inspectServer.listen(0, "127.0.0.1", resolve)
  );
  childEnvironment = {
    ...process.env,
    NODE_OPTIONS: "--preserve-symlinks",
    WEBSITE_INTEGRATION_ENABLED: "true",
    WEBSITE_INTEGRATION_MODE: "local",
    URL: "http://127.0.0.1:8080/docs",
    WEBSITE_URL: "http://127.0.0.1:8080/",
    HYDRA_PUBLIC_URL: "http://127.0.0.1:14444/",
    WEBSITE_INTERNAL_URL: `http://127.0.0.1:${(inspectServer.address() as AddressInfo).port}/`,
    OUTLINE_OIDC_CLIENT_ID: "ex-outline-local",
    IDENTITY_BOOTSTRAP_KEY: "a".repeat(64),
  };
  await runFile(
    process.execPath,
    [
      path.resolve("build/server/scripts/integration-bootstrap.js"),
      "--admin-user-id",
      subject,
    ],
    { env: childEnvironment, timeout: 20_000 }
  );
  expect(inspections).toBeGreaterThanOrEqual(2);
});

afterEach(async () => {
  inspectServer.closeAllConnections();
  await new Promise<void>((resolve) => inspectServer.close(() => resolve()));
});

async function snapshot(): Promise<string> {
  const tables = await sequelize.query<{ name: string }>(
    "SELECT table_name AS name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY table_name",
    { type: QueryTypes.SELECT, raw: true }
  );
  const digests: string[] = [];
  for (const { name: table } of tables) {
    const identifier = `"${table.replace(/"/g, '""')}"`;
    const rows = await sequelize.query<{ digest: string }>(
      `SELECT md5(COALESCE(string_agg(to_jsonb(t)::text, '' ORDER BY to_jsonb(t)::text), '')) AS digest FROM ${identifier} t`,
      { type: QueryTypes.SELECT }
    );
    digests.push(`${table}:${rows[0].digest}`);
  }
  return digests.join("\n");
}

async function check(admin = subject, changes: NodeJS.ProcessEnv = {}) {
  return runFile(
    process.execPath,
    [
      path.resolve("build/server/scripts/integration-check.js"),
      "--admin-user-id",
      admin,
    ],
    { env: { ...childEnvironment, ...changes }, timeout: 20_000 }
  );
}

it("runs the real readiness CLI successfully against a migrated bootstrapped outline database without writes", async () => {
  const before = await snapshot();
  const result = await check();
  expect(JSON.parse(result.stdout)).toMatchObject({
    issuer: "http://127.0.0.1:14444/",
    clientId: "ex-outline-local",
  });
  expect(await snapshot()).toBe(before);
  const repeated = await check();
  expect(repeated.stdout).toBe(result.stdout);
  expect(await snapshot()).toBe(before);
  const ordinary = await runFile(
    process.execPath,
    [path.resolve("build/server/scripts/integration-check.js")],
    { env: childEnvironment, timeout: 20_000 }
  );
  expect(ordinary.stdout).toBe(result.stdout);
  expect(await snapshot()).toBe(before);
  await expect(
    runFile(
      process.execPath,
      [
        path.resolve("build/server/scripts/integration-check.js"),
        "--admin-user-id",
      ],
      { env: childEnvironment, timeout: 20_000 }
    )
  ).rejects.toThrow();
  expect(await snapshot()).toBe(before);
}, 60_000);

it("rejects missing migration column issuer administrator provider identity and authentication without repairing data", async () => {
  const healthy = await snapshot();
  const mutations = [
    [
      '"SequelizeMeta"',
      "DELETE FROM \"SequelizeMeta\" WHERE name='20260930000000-website-integration.js'",
    ],
    [
      "external_sessions",
      'ALTER TABLE external_sessions DROP COLUMN "encryptedAccessToken"',
    ],
    [
      "website_integrations",
      "UPDATE website_integrations SET issuer='http://127.0.0.1:15555/'",
    ],
    [
      "authentication_providers",
      "UPDATE authentication_providers SET enabled=false",
    ],
    ["external_identities", "DELETE FROM external_identities"],
    ["user_authentications", "DELETE FROM user_authentications"],
  ];
  for (const [table, mutation] of mutations) {
    const rows = await sequelize.query<{ data: object }>(
      `SELECT to_jsonb(t) AS data FROM ${table} t`,
      { type: QueryTypes.SELECT, raw: true }
    );
    await sequelize.query(mutation);
    const broken = await snapshot();
    await expect(check()).rejects.toMatchObject({
      code: 1,
      stderr: expect.stringContaining("Integration check failed;"),
    });
    expect(await snapshot(), table).toBe(broken);
    if (table === "external_sessions") {
      await sequelize.query(
        'ALTER TABLE external_sessions ADD COLUMN "encryptedAccessToken" TEXT'
      );
    } else if (table === "website_integrations") {
      await sequelize.query(
        "UPDATE website_integrations SET issuer='http://127.0.0.1:14444/'"
      );
    } else if (table === "authentication_providers") {
      await sequelize.query("UPDATE authentication_providers SET enabled=true");
    } else {
      await sequelize.query(`DELETE FROM ${table}`);
      await sequelize.query(
        `INSERT INTO ${table} SELECT * FROM json_populate_recordset(NULL::${table}, :rows)`,
        { replacements: { rows: JSON.stringify(rows.map((row) => row.data)) } }
      );
    }
    expect(await snapshot(), table).toBe(healthy);
    await check();
  }
  await expect(check(randomUUID())).rejects.toMatchObject({
    code: 1,
    stderr: expect.stringContaining("Integration check failed;"),
  });
  expect(await snapshot()).toBe(healthy);
}, 120_000);
