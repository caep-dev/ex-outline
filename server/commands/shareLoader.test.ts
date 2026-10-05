import { faker } from "@faker-js/faker";
import { randomUUID } from "node:crypto";
import { WebsiteIntegration } from "@server/models";
import {
  buildCollection,
  buildDocument,
  buildShare,
  buildTeam,
  buildUser,
} from "@server/test/factories";
import { loadPublicShare, loadShareWithParent } from "./shareLoader";

describe("shareLoader", () => {
  describe("collection share", () => {
    it("should return share with tree and collection when requested with id", async () => {
      const user = await buildUser();
      const collection = await buildCollection({
        userId: user.id,
        teamId: user.teamId,
      });
      const document = await buildDocument({
        collectionId: collection.id,
        userId: user.id,
        teamId: user.teamId,
      });
      const childDocument = await buildDocument({
        parentDocumentId: document.id,
        collectionId: collection.id,
        userId: user.id,
        teamId: user.teamId,
      });
      const share = await buildShare({
        userId: user.id,
        teamId: user.teamId,
        collectionId: collection.id,
      });

      const result = await loadPublicShare({
        id: share.id,
      });

      expect(result.share.id).toEqual(share.id);
      expect(result.collection?.id).toEqual(collection.id);
      expect(result.sharedTree?.id).toEqual(collection.id);
      expect(result.sharedTree?.url).toEqual(collection.path);
      expect(result.sharedTree?.children[0].id).toEqual(document.id);
      expect(result.sharedTree?.children[0].children[0].id).toEqual(
        childDocument.id
      );
      expect(result.document).toBeNull();
    });

    it("should return correct path for root node in sharedTree for domain", async () => {
      const user = await buildUser();
      const collection = await buildCollection({
        userId: user.id,
        teamId: user.teamId,
      });
      const document = await buildDocument({
        collectionId: collection.id,
        userId: user.id,
        teamId: user.teamId,
      });
      await buildDocument({
        parentDocumentId: document.id,
        collectionId: collection.id,
        userId: user.id,
        teamId: user.teamId,
      });
      const share = await buildShare({
        userId: user.id,
        teamId: user.teamId,
        collectionId: collection.id,
        domain: faker.internet.domainName(),
      });

      const result = await loadPublicShare({
        id: share.id,
      });

      expect(result.share.id).toEqual(share.id);
      expect(result.collection?.id).toEqual(collection.id);
      expect(result.sharedTree?.id).toEqual(collection.id);
      expect(result.sharedTree?.url).toEqual("");
    });

    it("should return only share when requested with collectionId", async () => {
      const user = await buildUser();
      const collection = await buildCollection({
        userId: user.id,
        teamId: user.teamId,
      });
      const share = await buildShare({
        userId: user.id,
        teamId: user.teamId,
        collectionId: collection.id,
      });

      const result = await loadShareWithParent({
        collectionId: collection.id,
        user,
      });

      expect(result.share.id).toEqual(share.id);
      expect(result.parentShare).toBeNull();
    });

    it("should throw error when the requested collection is not part of the share", async () => {
      const user = await buildUser();
      const collection = await buildCollection({
        userId: user.id,
        teamId: user.teamId,
      });
      const anotherCollection = await buildCollection({
        userId: user.id,
        teamId: user.teamId,
      });
      const share = await buildShare({
        userId: user.id,
        teamId: user.teamId,
        collectionId: collection.id,
      });

      await expect(
        loadPublicShare({ id: share.id, collectionId: anotherCollection.id })
      ).rejects.toThrow();
    });
  });

  describe("document share", () => {
    it("should return share with tree and document when requested with id", async () => {
      const user = await buildUser();
      const collection = await buildCollection({
        userId: user.id,
        teamId: user.teamId,
      });
      const document = await buildDocument({
        collectionId: collection.id,
        userId: user.id,
        teamId: user.teamId,
      });
      const childDocument = await buildDocument({
        parentDocumentId: document.id,
        collectionId: collection.id,
        userId: user.id,
        teamId: user.teamId,
      });
      const share = await buildShare({
        includeChildDocuments: true,
        userId: user.id,
        teamId: user.teamId,
        documentId: document.id,
      });

      const result = await loadPublicShare({
        id: share.id,
      });

      expect(result.share.id).toEqual(share.id);
      expect(result.document?.id).toEqual(document.id);
      expect(result.sharedTree?.id).toEqual(document.id);
      expect(result.sharedTree?.children.length).toEqual(1);
      expect(result.sharedTree?.children[0].id).toEqual(childDocument.id);
      expect(result.collection).toBeNull();
    });

    it("should not return share tree when includeChildDocuments is false", async () => {
      const user = await buildUser();
      const collection = await buildCollection({
        userId: user.id,
        teamId: user.teamId,
      });
      const document = await buildDocument({
        collectionId: collection.id,
        userId: user.id,
        teamId: user.teamId,
      });
      await buildDocument({
        parentDocumentId: document.id,
        collectionId: collection.id,
        userId: user.id,
        teamId: user.teamId,
      });
      const share = await buildShare({
        includeChildDocuments: false,
        userId: user.id,
        teamId: user.teamId,
        documentId: document.id,
      });

      const result = await loadPublicShare({
        id: share.id,
      });

      expect(result.share.id).toEqual(share.id);
      expect(result.document?.id).toEqual(document.id);
      expect(result.sharedTree).toBeNull();
      expect(result.collection).toBeNull();
    });

    it("should return share and parentShare when requested with documentId", async () => {
      const user = await buildUser();
      const collection = await buildCollection({
        userId: user.id,
        teamId: user.teamId,
      });
      const document = await buildDocument({
        collectionId: collection.id,
        userId: user.id,
        teamId: user.teamId,
      });
      const childDocument = await buildDocument({
        parentDocumentId: document.id,
        collectionId: collection.id,
        userId: user.id,
        teamId: user.teamId,
      });
      const [parentShare, share] = await Promise.all([
        buildShare({
          includeChildDocuments: true,
          userId: user.id,
          teamId: user.teamId,
          documentId: document.id,
        }),
        buildShare({
          includeChildDocuments: false,
          userId: user.id,
          teamId: user.teamId,
          documentId: childDocument.id,
        }),
      ]);

      const result = await loadShareWithParent({
        documentId: childDocument.id,
        user,
      });

      expect(result.share.id).toEqual(share.id);
      expect(result.parentShare?.id).toEqual(parentShare.id);
    });

    it("should throw error when the requested document is not part of the share (includeChildDocuments = true)", async () => {
      const user = await buildUser();
      const collection = await buildCollection({
        userId: user.id,
        teamId: user.teamId,
      });
      const document = await buildDocument({
        collectionId: collection.id,
        userId: user.id,
        teamId: user.teamId,
      });
      const anotherDocument = await buildDocument({
        userId: user.id,
        teamId: user.teamId,
      });
      const share = await buildShare({
        includeChildDocuments: true,
        userId: user.id,
        teamId: user.teamId,
        documentId: document.id,
      });

      await expect(
        loadPublicShare({ id: share.id, documentId: anotherDocument.id })
      ).rejects.toThrow();
    });

    it("should throw error when the requested document is not part of the share (includeChildDocuments = false)", async () => {
      const user = await buildUser();
      const collection = await buildCollection({
        userId: user.id,
        teamId: user.teamId,
      });
      const document = await buildDocument({
        collectionId: collection.id,
        userId: user.id,
        teamId: user.teamId,
      });
      const anotherDocument = await buildDocument({
        userId: user.id,
        teamId: user.teamId,
      });
      const share = await buildShare({
        includeChildDocuments: false,
        userId: user.id,
        teamId: user.teamId,
        documentId: document.id,
      });

      await expect(
        loadPublicShare({ id: share.id, documentId: anotherDocument.id })
      ).rejects.toThrow();
    });

    it("should throw error when the child document is requested for a share with includeChildDocuments = false", async () => {
      const user = await buildUser();
      const collection = await buildCollection({
        userId: user.id,
        teamId: user.teamId,
      });
      const document = await buildDocument({
        collectionId: collection.id,
        userId: user.id,
        teamId: user.teamId,
      });
      const childDocument = await buildDocument({
        parentDocumentId: document.id,
        userId: user.id,
        teamId: user.teamId,
      });
      const share = await buildShare({
        includeChildDocuments: false,
        userId: user.id,
        teamId: user.teamId,
        documentId: document.id,
      });

      await expect(
        loadPublicShare({ id: share.id, documentId: childDocument.id })
      ).rejects.toThrow();
    });
  });

  describe("inactive share when requested with id", () => {
    it("should throw error when share is not published", async () => {
      const share = await buildShare({
        published: false,
      });

      await expect(loadPublicShare({ id: share.id })).rejects.toThrow();
    });

    it("should throw error when team has disabled sharing", async () => {
      const team = await buildTeam({
        sharing: false,
      });
      const share = await buildShare({
        teamId: team.id,
      });

      await expect(loadPublicShare({ id: share.id })).rejects.toThrow();
    });

    it("should throw error when team is suspended", async () => {
      const team = await buildTeam({
        suspendedAt: new Date(),
      });
      const share = await buildShare({
        teamId: team.id,
      });

      await expect(loadPublicShare({ id: share.id })).rejects.toThrow();
    });

    it("should throw error when collection has disabled sharing", async () => {
      const collection = await buildCollection({
        sharing: false,
      });
      const share = await buildShare({
        collectionId: collection.id,
        teamId: collection.teamId,
      });

      await expect(loadPublicShare({ id: share.id })).rejects.toThrow();
    });

    it("should throw error when collection is archived", async () => {
      const collection = await buildCollection({
        archivedAt: new Date(),
      });
      const share = await buildShare({
        collectionId: collection.id,
        teamId: collection.teamId,
      });

      await expect(loadPublicShare({ id: share.id })).rejects.toThrow();
    });

    it("should throw error when document is archived", async () => {
      const document = await buildDocument({
        archivedAt: new Date(),
      });
      const share = await buildShare({
        documentId: document.id,
        teamId: document.teamId,
      });

      await expect(loadPublicShare({ id: share.id })).rejects.toThrow();
    });
  });
});

describe("integrated legacy share loader", () => {
  it("does not expose a document share or draft navigation while resolving a collection share", async () => {
    const team = await buildTeam({ sharing: true });
    const user = await buildUser({ teamId: team.id });
    await WebsiteIntegration.create({
      key: "website",
      teamId: team.id,
      issuer: "http://identity.exwebsite.test:8090/",
      initialAdminSubject: randomUUID(),
    });
    const collection = await buildCollection({
      teamId: team.id,
      userId: user.id,
      sharing: true,
      permission: null,
    });
    const published = await buildDocument({
      teamId: team.id,
      userId: user.id,
      collectionId: collection.id,
      title: "Public child",
    });
    const draft = await buildDocument({
      teamId: team.id,
      userId: user.id,
      collectionId: collection.id,
      title: "Secret draft",
      publishedAt: null,
    });
    const collectionShare = await buildShare({
      teamId: team.id,
      userId: user.id,
      collectionId: collection.id,
      documentId: null,
    });
    const documentShare = await buildShare({
      teamId: team.id,
      userId: user.id,
      documentId: draft.id,
      collectionId: null,
    });

    await expect(loadPublicShare({ id: documentShare.id })).rejects.toThrow();
    await expect(
      loadPublicShare({ id: collectionShare.id, documentId: draft.id })
    ).rejects.toThrow();
    const loaded = await loadPublicShare({
      id: collectionShare.id,
      documentId: published.id,
    });
    expect(loaded.document?.id).toBe(published.id);
    expect(JSON.stringify(loaded.sharedTree)).toContain("Public child");
    expect(JSON.stringify(loaded.sharedTree)).not.toContain("Secret draft");
  });
});
