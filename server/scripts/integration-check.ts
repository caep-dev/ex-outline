import isUUID from "validator/lib/isUUID";
import { assertIntegrationReady } from "@server/identity/readiness";
import { sequelize } from "@server/storage/database";

async function main() {
  const args = process.argv.slice(2);
  if (
    args.length !== 0 &&
    (args.length !== 2 || args[0] !== "--admin-user-id" || !isUUID(args[1]))
  ) {
    throw new Error("INTEGRATION_CHECK_ADMIN_REQUIRED");
  }
  const result = await assertIntegrationReady(args[1]);
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
      // oxlint-disable-next-line no-console
      console.error(
        "Integration check failed; verify configuration, outline migrations and explicit administrator bootstrap"
      );
      await sequelize.close();
      process.exitCode = 1;
    }
  );
}
