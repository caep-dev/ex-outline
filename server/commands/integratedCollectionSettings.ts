import type { CollectionPermission } from "@shared/types";
import env from "@server/env";
import { ValidationError } from "@server/errors";

export function integratedCollectionSettings(
  permission: CollectionPermission | null | undefined,
  commenting: boolean | null | undefined
): { permission: null; commenting: true } {
  if (
    env.WEBSITE_INTEGRATION_ENABLED &&
    ((permission !== null && permission !== undefined) || commenting === false)
  ) {
    throw ValidationError(
      "Integrated collections require private access and reader comments"
    );
  }
  return { permission: null, commenting: true };
}

export function assertIntegratedCollectionUpdate(
  permission: CollectionPermission | null | undefined,
  commenting: boolean | null | undefined
): void {
  if (
    env.WEBSITE_INTEGRATION_ENABLED &&
    ((permission !== null && permission !== undefined) || commenting === false)
  ) {
    throw ValidationError(
      "Integrated collections require private access and reader comments"
    );
  }
}
