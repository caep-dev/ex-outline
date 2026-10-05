import { ExternalIdentity, User } from "@server/models";
import { sequelize } from "@server/storage/database";
import type { LinkedSessionCheck } from "./SessionGuard";

type Profile = Extract<LinkedSessionCheck, { active: true }>["profile"];

/** Applies Website profile checks monotonically without touching Outline roles. */
export async function syncWebsiteProfile(
  identity: ExternalIdentity,
  user: User,
  profile: Profile
): Promise<void> {
  if (
    !profile ||
    !Number.isSafeInteger(profile.version) ||
    profile.version < 0 ||
    typeof profile.nickname !== "string" ||
    typeof profile.email !== "string" ||
    (profile.avatarUrl !== null && typeof profile.avatarUrl !== "string")
  ) {
    throw new Error("Website profile check is invalid");
  }
  if (profile.version < identity.profileVersion) {
    return;
  }
  await sequelize.transaction(async (transaction) => {
    const current = await ExternalIdentity.findByPk(identity.id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (
      !current ||
      current.userId !== user.id ||
      profile.version < current.profileVersion
    ) {
      return;
    }
    const owner = await User.findOne({
      where: { email: profile.email },
      transaction,
    });
    if (owner && owner.id !== user.id) {
      throw new Error(
        "Website email is already in use; administrator resolution is required"
      );
    }
    await user.update(
      {
        name: profile.nickname,
        email: profile.email,
        avatarUrl: profile.avatarUrl,
      },
      { transaction }
    );
    await current.update({ profileVersion: profile.version }, { transaction });
  });
}
