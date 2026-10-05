import type {
  Hocuspocus,
  onAuthenticatePayload,
  onConfigurePayload,
  onDestroyPayload,
} from "@hocuspocus/server";
import { randomUUID } from "node:crypto";
import { AuthorizationChanged } from "@shared/collaboration/CloseEvents";
import { CollectionPermission } from "@shared/types";
import { sleep } from "@shared/utils/timers";
import env from "@server/env";
import WebsiteIdentityClient from "@server/identity/WebsiteIdentityClient";
import {
  issueCollaborationToken,
  websiteSessionGuard,
} from "@server/identity/authenticateExternalSession";
import {
  ExternalIdentity,
  ExternalSession,
  UserMembership,
  WebsiteIntegration,
} from "@server/models";
import type User from "@server/models/User";
import RedisAdapter from "@server/storage/redis";
import {
  buildAdmin,
  buildCollection,
  buildDocument,
  buildGroup,
  buildGroupUser,
  buildTeam,
  buildUser,
} from "@server/test/factories";
import { APIUpdateExtension } from "./APIUpdateExtension";
import AuthenticationExtension from "./AuthenticationExtension";

const buildConnection = (user: User) => ({
  context: { user },
  readOnly: false,
  close: vi.fn(),
});

type Connections = Record<string, ReturnType<typeof buildConnection>[]>;

describe("AuthenticationExtension", () => {
  let extension: AuthenticationExtension;

  const configure = (connections: Connections) => {
    const instance = {
      documents: new Map(
        Object.entries(connections).map(([documentId, forDocument]) => [
          `document.${documentId}`,
          { getConnections: () => forDocument },
        ])
      ),
    } as unknown as Hocuspocus;

    return extension.onConfigure({ instance } as onConfigurePayload);
  };

  /** Build a private collection that a member has been given access to. */
  const buildPrivateCollection = async () => {
    const team = await buildTeam();
    const admin = await buildAdmin({ teamId: team.id });
    const user = await buildUser({ teamId: team.id });
    const collection = await buildCollection({
      teamId: team.id,
      userId: admin.id,
      permission: null,
    });
    const document = await buildDocument({
      teamId: team.id,
      userId: admin.id,
      collectionId: collection.id,
    });
    const membership = await UserMembership.create({
      collectionId: collection.id,
      userId: user.id,
      createdById: admin.id,
      permission: CollectionPermission.ReadWrite,
    });

    return { admin, collection, document, membership, team, user };
  };

  const websiteSessionFor = async (user: User) => {
    const issuer = "http://identity.exwebsite.test:8090/";
    process.env.HYDRA_PUBLIC_URL = issuer;
    process.env.WEBSITE_INTERNAL_URL = "http://127.0.0.1:18766/";
    process.env.OUTLINE_INTEGRATION_KEY = "isolated-test-key";
    env.WEBSITE_INTEGRATION_ENABLED = true;
    await WebsiteIntegration.create({
      key: "website",
      teamId: user.teamId,
      issuer,
      initialAdminSubject: randomUUID(),
    });
    const websiteSessionId = randomUUID();
    const subject = randomUUID();
    await ExternalIdentity.create({ issuer, subject, userId: user.id });
    const session = await ExternalSession.create({
      userId: user.id,
      websiteSessionId,
      hydraSid: "safe-test-sid",
      clientId: "ex-outline",
      expiresAt: new Date(Date.now() + 60_000),
    });
    const check = vi
      .spyOn(WebsiteIdentityClient.prototype, "check")
      .mockResolvedValue({
        active: true,
        sessionId: websiteSessionId,
        userId: subject,
        expiresAt: Date.now() + 60_000,
        profile: {
          nickname: user.name,
          email: user.email ?? "collaborator@example.test",
          avatarUrl: null,
          version: 0,
        },
      });
    return { session, token: issueCollaborationToken(session), check };
  };

  beforeEach(() => {
    extension = new AuthenticationExtension();
  });

  afterEach(() => extension.onDestroy({} as onDestroyPayload));

  it("should disconnect when an invalidation is published", async () => {
    const { document, user } = await buildPrivateCollection();
    const connection = buildConnection(user);
    await configure({ [document.id]: [connection] });

    await AuthenticationExtension.invalidate({ userIds: [user.id] });
    await sleep(100);

    expect(connection.close).toHaveBeenCalledWith(AuthorizationChanged);
  });

  it("rejects a collaboration update after its Website lease expires", async () => {
    const assertActive = vi.fn(() => {
      throw new Error("expired");
    });
    await expect(
      extension.beforeHandleMessage({
        context: { websiteLease: { assertActive } },
      } as never)
    ).rejects.toThrow("expired");
    expect(assertActive).toHaveBeenCalledOnce();
  });

  it("rejects a denied collaboration handshake without starting a Website lease", async () => {
    const { document, membership, user } = await buildPrivateCollection();
    await membership.destroy();
    const { session, token, check } = await websiteSessionFor(user);
    const guard = websiteSessionGuard();
    const openLease = vi.spyOn(guard, "openLease");
    const interval = vi.spyOn(globalThis, "setInterval");
    const connection = buildConnection(user);
    let leases = 0;
    let timers = 0;
    let websiteChecks = 0;
    try {
      await expect(
        extension.onAuthenticate({
          connection,
          token,
          documentName: `document.${document.id}`,
          socketId: "denied-socket",
        } as unknown as onAuthenticatePayload)
      ).rejects.toThrow("Authorization required");
      await sleep(2300);
      leases = openLease.mock.calls.length;
      timers = interval.mock.calls.filter(
        ([, delay]) => delay === 2000 || delay === 250
      ).length;
      websiteChecks = check.mock.calls.length;
    } finally {
      guard.invalidate({ sessionId: session.websiteSessionId });
      openLease.mockRestore();
      interval.mockRestore();
      check.mockRestore();
    }
    expect({ leases, timers, websiteChecks }).toEqual({
      leases: 0,
      timers: 0,
      websiteChecks: 1,
    });
  }, 10_000);

  it("retains and releases a Website lease for an authorized collaboration connection", async () => {
    const { document, user } = await buildPrivateCollection();
    const { session, token, check } = await websiteSessionFor(user);
    const connection = buildConnection(user);
    const context = await extension.onAuthenticate({
      connection,
      token,
      documentName: `document.${document.id}`,
      socketId: "authorized-socket",
    } as unknown as onAuthenticatePayload);
    try {
      expect(context.websiteSessionId).toBe(session.websiteSessionId);
      expect(context.websiteLease).toBeDefined();
      expect(check).toHaveBeenCalledTimes(2);
      await expect(
        extension.beforeHandleMessage({ context } as never)
      ).resolves.toBeUndefined();
      await extension.onDisconnect({ context } as never);
      expect(() => context.websiteLease?.assertActive()).toThrow();
    } finally {
      context.websiteLease?.invalidate();
      check.mockRestore();
    }
  });

  it("should ignore messages for other collaboration channels", async () => {
    const { document, user } = await buildPrivateCollection();
    const apiUpdates = new APIUpdateExtension();
    await apiUpdates.onConfigure({} as onConfigurePayload);

    const connection = buildConnection(user);
    await configure({ [document.id]: [connection] });

    // Both extensions share a single subscriber, so a message for one must not
    // be handled by the other.
    await RedisAdapter.collaborationClient.publish(
      `collaboration:api-update:${document.id}`,
      JSON.stringify({ actorId: user.id })
    );
    await sleep(100);

    expect(connection.close).not.toHaveBeenCalled();

    await AuthenticationExtension.invalidate({ userIds: [user.id] });
    await sleep(100);

    expect(connection.close).toHaveBeenCalledWith(AuthorizationChanged);
    await apiUpdates.onDestroy({} as onDestroyPayload);
  });

  it("should disconnect connections for documents in the collection", async () => {
    const { collection, document, user } = await buildPrivateCollection();
    const connection = buildConnection(user);
    await configure({ [document.id]: [connection] });

    await extension.disconnect({
      userIds: [user.id],
      collectionId: collection.id,
    });

    expect(connection.close).toHaveBeenCalledWith(AuthorizationChanged);
  });

  it("should disconnect connections for members of the group", async () => {
    const { document, team, user } = await buildPrivateCollection();
    const group = await buildGroup({ teamId: team.id });
    await buildGroupUser({
      teamId: team.id,
      groupId: group.id,
      userId: user.id,
    });
    const connection = buildConnection(user);
    await configure({ [document.id]: [connection] });

    await extension.disconnect({ groupId: group.id });

    expect(connection.close).toHaveBeenCalledWith(AuthorizationChanged);
  });

  it("should not disconnect connections belonging to another user", async () => {
    const { collection, document, team, user } = await buildPrivateCollection();
    const other = await buildUser({ teamId: team.id });
    const connection = buildConnection(user);
    await configure({ [document.id]: [connection] });

    await extension.disconnect({
      userIds: [other.id],
      collectionId: collection.id,
    });

    expect(connection.close).not.toHaveBeenCalled();
  });

  it("should not disconnect connections for documents in another collection", async () => {
    const { document, team, user } = await buildPrivateCollection();
    const other = await buildCollection({ teamId: team.id });
    const connection = buildConnection(user);
    await configure({ [document.id]: [connection] });

    await extension.disconnect({ collectionId: other.id });

    expect(connection.close).not.toHaveBeenCalled();
  });

  it("should not disconnect connections for users outside the group", async () => {
    const { document, team, user } = await buildPrivateCollection();
    const group = await buildGroup({ teamId: team.id });
    const connection = buildConnection(user);
    await configure({ [document.id]: [connection] });

    await extension.disconnect({ groupId: group.id });

    expect(connection.close).not.toHaveBeenCalled();
  });

  it("should refuse to publish an empty scope", async () => {
    await expect(AuthenticationExtension.invalidate({})).rejects.toThrow(
      "must not be empty"
    );
    await expect(
      AuthenticationExtension.invalidate({ userIds: undefined })
    ).rejects.toThrow("must not be empty");
  });

  it("should not disconnect connections for other documents", async () => {
    const { document, user } = await buildPrivateCollection();
    const connection = buildConnection(user);
    await configure({ [document.id]: [connection] });

    await extension.disconnect({ documentIds: ["other-document-id"] });

    expect(connection.close).not.toHaveBeenCalled();
  });
});
