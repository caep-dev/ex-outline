import env from "@server/env";
import { ExternalIdentity, Team, WebsiteIntegration } from "@server/models";
import { sequelize } from "@server/storage/database";
import { buildAdmin, buildTeam } from "@server/test/factories";
import { assertIntegrationModeSafe, assertIntegrationReady } from "./readiness";

describe("read-only integration preparation", () => {
  it("refuses the disposable test database identity before touching preparation records", async () => {
    const query = vi.spyOn(sequelize, "query");
    const marker = vi.spyOn(WebsiteIntegration, "findByPk");
    await expect(assertIntegrationReady()).rejects.toThrow(
      "INTEGRATION_DATABASE_IDENTITY_MISMATCH"
    );
    expect(marker).not.toHaveBeenCalled();
    expect(
      query.mock.calls.some(
        ([sql]) =>
          typeof sql === "string" &&
          /^(CREATE|ALTER|INSERT|UPDATE|DELETE|TRUNCATE)/i.test(sql)
      )
    ).toBe(false);
    expect(
      query.mock.calls.some(([sql]) => sql === "SET TRANSACTION READ ONLY")
    ).toBe(true);
    query.mockRestore();
    marker.mockRestore();
  });

  it("refuses disabling integration for an existing marked workspace without changing data", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const subject = "01234567-89ab-4cde-8123-456789abcdef";
    await ExternalIdentity.create({
      issuer: "http://127.0.0.1:1/",
      subject,
      userId: admin.id,
    });
    await WebsiteIntegration.create({
      key: "website",
      teamId: team.id,
      issuer: "http://127.0.0.1:1/",
      initialAdminSubject: subject,
    });
    const before = env.WEBSITE_INTEGRATION_ENABLED;
    env.WEBSITE_INTEGRATION_ENABLED = false;
    try {
      await expect(assertIntegrationModeSafe()).rejects.toThrow(
        "INTEGRATION_CANNOT_BE_DISABLED"
      );
      expect(await Team.count()).toBe(1);
      expect(await WebsiteIntegration.count()).toBe(1);
    } finally {
      env.WEBSITE_INTEGRATION_ENABLED = before;
    }
  });
});
