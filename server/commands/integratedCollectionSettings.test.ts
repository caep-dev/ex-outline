import { CollectionPermission } from "@shared/types";
import env from "@server/env";
import {
  integratedCollectionSettings,
  assertIntegratedCollectionUpdate,
} from "./integratedCollectionSettings";

describe("integrated collection settings", () => {
  const previous = env.WEBSITE_INTEGRATION_ENABLED;
  beforeEach(() => {
    env.WEBSITE_INTEGRATION_ENABLED = true;
  });
  afterEach(() => {
    env.WEBSITE_INTEGRATION_ENABLED = previous;
  });

  it("creates private collections with reader comments enabled", () => {
    expect(integratedCollectionSettings(null, undefined)).toEqual({
      permission: null,
      commenting: true,
    });
    expect(integratedCollectionSettings(undefined, undefined)).toEqual({
      permission: null,
      commenting: true,
    });
    expect(() =>
      integratedCollectionSettings(CollectionPermission.ReadWrite, true)
    ).toThrow();
    expect(() => integratedCollectionSettings(null, false)).toThrow();
  });

  it("rejects later changes to workspace-wide access or reader comments", () => {
    expect(() =>
      assertIntegratedCollectionUpdate(CollectionPermission.Read, undefined)
    ).toThrow();
    expect(() => assertIntegratedCollectionUpdate(undefined, false)).toThrow();
    expect(() => assertIntegratedCollectionUpdate(null, true)).not.toThrow();
    expect(() =>
      assertIntegratedCollectionUpdate(undefined, undefined)
    ).not.toThrow();
  });
});
