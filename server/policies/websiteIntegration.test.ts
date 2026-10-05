import { CollectionPermission, UserRole } from "@shared/types";
import env from "@server/env";
import { Collection, Document } from "@server/models";
import {
  buildAdmin,
  buildCollection,
  buildDocument,
  buildTeam,
  buildUser,
} from "@server/test/factories";
import { serialize } from "./index";

describe("Website integrated document permissions", () => {
  const original = env.WEBSITE_INTEGRATION_ENABLED;
  beforeEach(() => {
    env.WEBSITE_INTEGRATION_ENABLED = true;
  });
  afterEach(() => {
    env.WEBSITE_INTEGRATION_ENABLED = original;
  });

  it("lets an explicitly authorized Viewer edit one collection and denies global admin actions", async () => {
    const team = await buildTeam({ memberCollectionCreate: true });
    const admin = await buildAdmin({ teamId: team.id });
    const viewer = await buildUser({ teamId: team.id, role: UserRole.Viewer });
    const collection = await buildCollection({
      teamId: team.id,
      permission: null,
    });
    await collection.$add("user", viewer, {
      through: {
        permission: CollectionPermission.ReadWrite,
        createdById: admin.id,
      },
    });
    const loaded = await Collection.findByPk(collection.id, {
      userId: viewer.id,
    });
    const abilities = serialize(viewer, loaded);
    expect(abilities.createDocument).toBeTruthy();
    expect(abilities.updateDocument).toBeTruthy();
    expect(abilities.readDocument).toBeTruthy();
    expect(abilities.share).toBe(false);
    expect(serialize(viewer, team).createCollection).toBe(false);
    const doc = await buildDocument({
      teamId: team.id,
      collectionId: collection.id,
    });
    const document = await Document.findByPk(doc.id, { userId: viewer.id });
    const docAbilities = serialize(viewer, document);
    expect(docAbilities.update).toBeTruthy();
    expect(docAbilities.manageUsers).toBe(false);
  });

  it("allows explicit Read membership to comment without editing", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const viewer = await buildUser({ teamId: team.id, role: UserRole.Viewer });
    const collection = await buildCollection({
      teamId: team.id,
      permission: null,
    });
    await collection.$add("user", viewer, {
      through: { permission: CollectionPermission.Read, createdById: admin.id },
    });
    const doc = await buildDocument({
      teamId: team.id,
      collectionId: collection.id,
    });
    const document = await Document.findByPk(doc.id, { userId: viewer.id });
    const abilities = serialize(viewer, document);
    expect(abilities.read).toBeTruthy();
    expect(abilities.comment).toBeTruthy();
    expect(abilities.update).toBe(false);
    expect(abilities.publish).toBe(false);
  });

  it("lets a collection ReadWrite Viewer unpublish while Read cannot", async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const editor = await buildUser({ teamId: team.id, role: UserRole.Viewer });
    const reader = await buildUser({ teamId: team.id, role: UserRole.Viewer });
    const collection = await buildCollection({
      teamId: team.id,
      permission: null,
    });
    await collection.$add("user", editor, {
      through: {
        permission: CollectionPermission.ReadWrite,
        createdById: admin.id,
      },
    });
    await collection.$add("user", reader, {
      through: { permission: CollectionPermission.Read, createdById: admin.id },
    });
    const doc = await buildDocument({
      teamId: team.id,
      collectionId: collection.id,
    });
    expect(
      serialize(editor, await Document.findByPk(doc.id, { userId: editor.id }))
        .unpublish
    ).toBeTruthy();
    expect(
      serialize(reader, await Document.findByPk(doc.id, { userId: reader.id }))
        .unpublish
    ).toBe(false);
  });
});
