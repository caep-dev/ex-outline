import { randomUUID } from "node:crypto";
import { CommentingAccess, TeamPreference, UserRole } from "@shared/types";
import env from "@server/env";
import {
  ExternalIdentity,
  Team,
  User,
  WebsiteIntegration,
} from "@server/models";
import { buildTeam } from "@server/test/factories";
import { bootstrapIntegration } from "./integration-bootstrap";

const subject = randomUUID();
const profile = {
  id: subject,
  nickname: "Website admin",
  email: "admin@example.com",
  avatarUrl: null,
  profileVersion: 3,
};
const originalIntegrationEnabled = env.WEBSITE_INTEGRATION_ENABLED;

describe("explicit integration bootstrap", () => {
  beforeEach(() => {
    env.WEBSITE_INTEGRATION_ENABLED = true;
    vi.stubEnv("HYDRA_PUBLIC_URL", "http://identity.exwebsite.test:8090/");
  });

  afterEach(() => {
    env.WEBSITE_INTEGRATION_ENABLED = originalIntegrationEnabled;
    vi.unstubAllEnvs();
  });

  it("serializes concurrent bootstrap and keeps retries idempotent without restoring roles", async () => {
    const inspect = vi.fn(async () => profile);
    const [first, concurrent] = await Promise.all([
      bootstrapIntegration(subject, inspect),
      bootstrapIntegration(subject, inspect),
    ]);
    expect(first.teamId).toBe(concurrent.teamId);
    expect(await Team.count({ paranoid: false })).toBe(1);
    const team = await Team.findByPk(first.teamId, { rejectOnEmpty: true });
    expect(team.defaultUserRole).toBe(UserRole.Viewer);
    expect(team.memberCollectionCreate).toBe(false);
    expect(team.memberTeamCreate).toBe(false);
    expect(team.getPreference(TeamPreference.MCP)).toBe(false);
    expect(team.getPreference(TeamPreference.MembersCanCreateApiKey)).toBe(
      false
    );
    expect(team.getPreference(TeamPreference.Commenting)).toBe(
      CommentingAccess.Members
    );
    const admin = await User.findByPk(first.userId, { rejectOnEmpty: true });
    expect(admin.role).toBe(UserRole.Admin);
    expect(admin.email).toBe(profile.email);
    await User.create({
      teamId: team.id,
      name: "Replacement administrator",
      email: "replacement@example.com",
      role: UserRole.Admin,
    });
    await admin.update({ role: UserRole.Viewer });
    expect((await bootstrapIntegration(subject, inspect)).userId).toBe(
      first.userId
    );
    await admin.reload();
    expect(admin.role).toBe(UserRole.Viewer);
    const otherSubject = randomUUID();
    await expect(
      bootstrapIntegration(otherSubject, async () => ({
        ...profile,
        id: otherSubject,
      }))
    ).rejects.toThrow(
      "Workspace initialization conflicts with the existing administrator or issuer"
    );
    expect(await WebsiteIntegration.count()).toBe(1);
    expect(await ExternalIdentity.count()).toBe(1);
  });

  it("rolls back initialization if the Website account is disabled before commit", async () => {
    const inspect = vi
      .fn()
      .mockResolvedValueOnce(profile)
      .mockRejectedValueOnce(new Error("disabled"));
    await expect(bootstrapIntegration(subject, inspect)).rejects.toThrow(
      "disabled"
    );
    expect(inspect).toHaveBeenCalledTimes(2);
    expect(await Team.count({ paranoid: false })).toBe(0);
    expect(await WebsiteIntegration.count()).toBe(0);
    expect(await ExternalIdentity.count()).toBe(0);
  });

  it("refuses an existing unrelated workspace instead of claiming or resetting it", async () => {
    const existing = await buildTeam();
    await expect(
      bootstrapIntegration(subject, async () => profile)
    ).rejects.toThrow(
      "Integration bootstrap requires an empty Outline workspace database"
    );
    expect(await Team.count({ paranoid: false })).toBe(1);
    expect(await Team.findByPk(existing.id)).not.toBeNull();
    expect(await WebsiteIntegration.count()).toBe(0);
  });
});
