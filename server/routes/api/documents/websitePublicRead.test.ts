import { randomUUID } from "node:crypto";
import { CSRF } from "@shared/constants";
import env from "@server/env";
import WebsiteIdentityClient from "@server/identity/WebsiteIdentityClient";
import { issueExternalSessionToken } from "@server/identity/authenticateExternalSession";
import {
  ExternalIdentity,
  ExternalSession,
  Share,
  WebsiteIntegration,
} from "@server/models";
import {
  buildAdmin,
  buildCollection,
  buildComment,
  buildDocument,
  buildShare,
  buildTeam,
  buildViewer,
} from "@server/test/factories";
import { getTestServer } from "@server/test/support";
import { bundleToken, generateRawToken } from "@server/utils/csrf";

const server = getTestServer();

it("gives a signed-in public-only reader a minimal current document projection", async () => {
  const issuer = "http://identity.exwebsite.test:8090/";
  process.env.HYDRA_PUBLIC_URL = issuer;
  process.env.WEBSITE_INTERNAL_URL = "http://127.0.0.1:18766/";
  process.env.OUTLINE_INTEGRATION_KEY = "isolated-test-key";
  env.WEBSITE_INTEGRATION_ENABLED = true;
  const team = await buildTeam({ sharing: true });
  const admin = await buildAdmin({ teamId: team.id });
  const viewer = await buildViewer({ teamId: team.id });
  await WebsiteIntegration.create({
    key: "website",
    teamId: team.id,
    issuer,
    initialAdminSubject: randomUUID(),
  });
  const collection = await buildCollection({
    teamId: team.id,
    createdById: admin.id,
    sharing: true,
    permission: null,
  });
  const share = await buildShare({
    teamId: team.id,
    userId: admin.id,
    collectionId: collection.id,
    documentId: null,
    published: true,
  });
  const document = await buildDocument({
    teamId: team.id,
    userId: admin.id,
    collectionId: collection.id,
    title: "Visible raretrace document",
    text: "raretrace published body",
  });
  const draft = await buildDocument({
    teamId: team.id,
    userId: admin.id,
    collectionId: collection.id,
    title: "Secret raretrace draft",
    text: "raretrace secret draft",
    publishedAt: null,
  });
  const privateCollection = await buildCollection({
    teamId: team.id,
    createdById: admin.id,
    permission: null,
  });
  const privateDocument = await buildDocument({
    teamId: team.id,
    userId: admin.id,
    collectionId: privateCollection.id,
    title: "Private raretrace document",
    text: "raretrace private body",
  });
  await buildDocument({
    title: "Other workspace raretrace",
    text: "raretrace other team",
  });
  const websiteSessionId = randomUUID();
  const subject = randomUUID();
  await ExternalIdentity.create({ issuer, subject, userId: viewer.id });
  const session = await ExternalSession.create({
    userId: viewer.id,
    websiteSessionId,
    hydraSid: "safe-test-sid",
    clientId: "ex-outline",
    expiresAt: new Date(Date.now() + 60_000),
  });
  vi.spyOn(WebsiteIdentityClient.prototype, "check").mockResolvedValue({
    active: true,
    sessionId: websiteSessionId,
    userId: subject,
    expiresAt: Date.now() + 60_000,
    profile: {
      nickname: viewer.name,
      email: viewer.email ?? "reader@example.test",
      avatarUrl: null,
      version: 0,
    },
  });
  const csrf = bundleToken(generateRawToken(16), env.SECRET_KEY);
  const authenticatedHeaders = {
    Cookie: `exdocs_access=${issueExternalSessionToken(session)}; ${CSRF.cookieName}=${csrf}`,
    [CSRF.headerName]: csrf,
    Origin: new URL(env.URL).origin,
  };
  const request = () =>
    server.post("/api/documents.info", {
      body: { id: document.id },
      headers: { ...authenticatedHeaders, "x-api-version": "4" },
    });

  const response = await request();
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body.publicOnly).toBe(true);
  expect(body.data.document).toEqual({
    id: document.id,
    collectionId: collection.id,
    title: document.title,
    content: expect.any(Object),
    url: document.path,
    updatedAt: expect.any(String),
  });
  expect(JSON.stringify(body)).not.toMatch(
    /createdBy|updatedBy|collaboratorIds|signedUrl|email/
  );
  expect(body.policies).toEqual([
    {
      id: document.id,
      abilities: { read: true, comment: true, update: false },
    },
  ]);

  for (const hidden of [draft.id, privateDocument.id]) {
    const hiddenResponse = await server.post("/api/documents.info", {
      body: { id: hidden },
      headers: { ...authenticatedHeaders, "x-api-version": "4" },
    });
    expect(hiddenResponse.status).not.toBe(200);
  }
  const list = await server.post("/api/documents.list", {
    body: {},
    headers: authenticatedHeaders,
  });
  expect(list.status).toBe(200);
  const listed = await list.json();
  expect(listed.data).toEqual([
    {
      id: document.id,
      title: document.title,
      url: document.path,
      collectionId: collection.id,
      updatedAt: expect.any(String),
      publicOnly: true,
    },
  ]);
  expect(JSON.stringify(listed)).not.toMatch(
    /Secret raretrace|Private raretrace|createdBy|collaboratorIds/
  );
  const indexedPublicList = await server.post("/api/documents.list", {
    body: { collectionId: collection.id, sort: "index" },
    headers: authenticatedHeaders,
  });
  expect(indexedPublicList.status).toBe(200);
  expect((await indexedPublicList.json()).data).toEqual(listed.data);
  for (const endpoint of ["collections.info", "collections.documents"]) {
    const internalCollectionResponse = await server.post(`/api/${endpoint}`, {
      body: { id: collection.id },
      headers: authenticatedHeaders,
    });
    expect(internalCollectionResponse.status).not.toBe(200);
  }
  const search = await server.post("/api/documents.search", {
    body: { query: "raretrace" },
    headers: authenticatedHeaders,
  });
  expect(search.status).toBe(200);
  const searched = await search.json();
  expect(
    searched.data.map(
      (entry: { document: { id: string } }) => entry.document.id
    )
  ).toEqual([document.id]);
  expect(JSON.stringify(searched)).not.toMatch(
    /Secret raretrace|Private raretrace|createdBy|collaboratorIds/
  );
  const titleSearch = await server.post("/api/documents.search_titles", {
    body: { query: "raretrace" },
    headers: authenticatedHeaders,
  });
  expect(titleSearch.status).toBe(200);
  expect((await titleSearch.json()).data).toEqual([
    {
      id: document.id,
      title: document.title,
      url: document.path,
      collectionId: collection.id,
      updatedAt: expect.any(String),
      publicOnly: true,
    },
  ]);

  const commentRequest = () =>
    server.post("/api/comments.create", {
      body: { documentId: document.id, text: "A public reader comment" },
      headers: authenticatedHeaders,
    });
  const commentResponse = await commentRequest();
  expect(commentResponse.status).toBe(200);
  const createdComment = await commentResponse.json();
  expect(createdComment.data.createdBy).toEqual({
    id: viewer.id,
    name: viewer.name,
    avatarUrl: viewer.avatarUrl ?? null,
  });
  expect(Object.keys(createdComment.data).sort()).toEqual([
    "createdBy",
    "data",
    "id",
    "resolvedBy",
  ]);
  expect(JSON.stringify(createdComment)).not.toMatch(
    /email|role|isSuspended|lastActiveAt/
  );
  await buildComment({ userId: admin.id, documentId: draft.id });
  await buildComment({ userId: admin.id, documentId: privateDocument.id });
  const commentsResponse = await server.post("/api/comments.list", {
    body: { documentId: document.id },
    headers: authenticatedHeaders,
  });
  expect(commentsResponse.status).toBe(200);
  const listedComments = await commentsResponse.json();
  expect(listedComments.data).toHaveLength(1);
  expect(Object.keys(listedComments.data[0]).sort()).toEqual([
    "createdBy",
    "data",
    "id",
    "resolvedBy",
  ]);
  expect(JSON.stringify(listedComments)).not.toMatch(
    /email|role|isSuspended|lastActiveAt/
  );
  const commentInfo = await server.post("/api/comments.info", {
    body: { id: createdComment.data.id },
    headers: authenticatedHeaders,
  });
  expect(commentInfo.status).toBe(200);
  const infoComment = await commentInfo.json();
  expect(Object.keys(infoComment.data).sort()).toEqual([
    "createdBy",
    "data",
    "id",
    "resolvedBy",
  ]);
  expect(JSON.stringify(infoComment)).not.toMatch(
    /email|role|isSuspended|lastActiveAt/
  );
  for (const body of [{}, { collectionId: collection.id }]) {
    const page = await server.post("/api/comments.list", {
      body,
      headers: authenticatedHeaders,
    });
    expect(page.status).toBe(200);
    expect((await page.json()).data).toHaveLength(1);
  }

  await Share.update({ revokedAt: new Date() }, { where: { id: share.id } });
  const revoked = await request();
  expect(revoked.status).not.toBe(200);
  expect((await commentRequest()).status).not.toBe(200);
  const revokedSearch = await server.post("/api/documents.search", {
    body: { query: "raretrace" },
    headers: authenticatedHeaders,
  });
  expect(revokedSearch.status).toBe(200);
  expect((await revokedSearch.json()).data).toHaveLength(0);
  const afterRevoke = await server.post("/api/comments.list", {
    body: {},
    headers: authenticatedHeaders,
  });
  expect(afterRevoke.status).toBe(200);
  expect((await afterRevoke.json()).data).toHaveLength(0);
});
