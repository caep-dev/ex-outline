import { buildUser } from "@server/test/factories";
import { ExternalIdentity, User } from "@server/models";
import { syncWebsiteProfile } from "./syncWebsiteProfile";

describe("Website profile synchronization", () => {
  it("applies newer profiles and ignores late older checks", async () => {
    const user = await buildUser();
    const identity = await ExternalIdentity.create({
      issuer: "http://identity.exwebsite.test:8090/",
      subject: crypto.randomUUID(),
      userId: user.id,
      profileVersion: 1,
    });
    await syncWebsiteProfile(identity, user, {
      nickname: "Current",
      email: "current-profile@example.test",
      avatarUrl: null,
      version: 3,
    });
    await syncWebsiteProfile(identity, user, {
      nickname: "Old",
      email: "old-profile@example.test",
      avatarUrl: "http://old.example/avatar",
      version: 2,
    });
    const reloaded = await User.findByPk(user.id);
    expect(reloaded?.name).toBe("Current");
    expect(reloaded?.email).toBe("current-profile@example.test");
    expect(reloaded?.avatarUrl).toBeNull();
    expect((await ExternalIdentity.findByPk(identity.id))?.profileVersion).toBe(
      3
    );
  });
});
