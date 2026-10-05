import { randomUUID } from "node:crypto";
import env from "@server/env";
import { WebsiteIntegration } from "@server/models";
import {
  buildCollection,
  buildDocument,
  buildShare,
  buildTeam,
  buildUser,
} from "@server/test/factories";
import { getTestServer } from "@server/test/support";

const server = getTestServer();

async function publicFixture() {
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
    createdById: user.id,
    sharing: true,
    permission: null,
  });
  await buildShare({
    teamId: team.id,
    userId: user.id,
    collectionId: collection.id,
    documentId: null,
    published: true,
    includeChildDocuments: true,
    allowIndexing: true,
  });
  return { team, user, collection };
}

describe("integrated public read API", () => {
  it("returns fresh public collection IDs without private or other-workspace collections", async () => {
    const { publicCollectionIds } =
      await import("@server/commands/publicAccess");
    const { Share } = await import("@server/models");
    const { collection, user, team } = await publicFixture();
    await buildCollection({ teamId: team.id, createdById: user.id });
    const other = await buildCollection({ sharing: true });
    await buildShare({
      collectionId: other.id,
      teamId: other.teamId,
      documentId: null,
      published: true,
    });
    expect(await publicCollectionIds()).toEqual([collection.id]);
    await Share.update(
      { revokedAt: new Date() },
      { where: { collectionId: collection.id } }
    );
    expect(await publicCollectionIds()).toEqual([]);
    env.WEBSITE_INTEGRATION_ENABLED = false;
    expect(await publicCollectionIds()).toEqual([]);
  });

  it("redirects valid legacy collection shares to canonical pages and hides drafts and revoked shares", async () => {
    env.URL = "http://exwebsite.test:8090/docs";
    const { collection, user, team } = await publicFixture();
    const { Share } = await import("@server/models");
    const share = await Share.findOne({
      where: { collectionId: collection.id },
      rejectOnEmpty: true,
    });
    const document = await buildDocument({
      collectionId: collection.id,
      teamId: team.id,
      userId: user.id,
    });
    const draft = await buildDocument({
      collectionId: collection.id,
      teamId: team.id,
      userId: user.id,
      publishedAt: null,
    });
    const response = await server.get(`/s/${share.id}`, { redirect: "manual" });
    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe(
      `http://exwebsite.test:8090/docs/public/collection/${collection.id}`
    );
    expect(response.headers.get("cache-control")).toBe("no-store");
    const documentResponse = await server.get(
      `/s/${share.id}${document.path}`,
      {
        redirect: "manual",
      }
    );
    expect(documentResponse.status).toBe(308);
    expect(documentResponse.headers.get("location")).toBe(
      `http://exwebsite.test:8090/docs${document.path}`
    );
    expect((await server.get(`/s/${share.id}${draft.path}`)).status).toBe(404);
    await share.update({ revokedAt: new Date() });
    expect((await server.get(`/s/${share.id}`)).status).toBe(404);
    expect((await server.get(`/s/${share.id}${document.path}`)).status).toBe(
      404
    );
  });

  it("searches and paginates only current public rows without private snippets", async () => {
    const { collection, user, team } = await publicFixture();
    const visible = await buildDocument({
      collectionId: collection.id,
      teamId: team.id,
      userId: user.id,
      title: "Visible raresearch",
      text: "raresearch public snippet",
    });
    await buildDocument({
      collectionId: collection.id,
      teamId: team.id,
      userId: user.id,
      publishedAt: null,
      title: "Secret raresearch",
      text: "raresearch private snippet",
    });
    await buildDocument({
      title: "Other raresearch",
      text: "raresearch other workspace",
    });
    const response = await server.post("/api/public.documents.search", {
      body: { query: "raresearch", limit: 1 },
      headers: { Cookie: "exdocs_access=expired-cookie" },
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.pagination).toEqual({ offset: 0, limit: 1, hasMore: false });
    expect(body.data).toEqual([
      {
        id: visible.id,
        collectionId: collection.id,
        title: visible.title,
        url: visible.path,
        excerpt: "raresearch public snippet",
      },
    ]);
    const { Share } = await import("@server/models");
    await Share.update(
      { revokedAt: new Date() },
      { where: { collectionId: collection.id } }
    );
    const revoked = await server.post("/api/public.documents.search", {
      body: { query: "raresearch" },
    });
    expect((await revoked.json()).data).toEqual([]);
  });

  it("includes only currently public canonical URLs in the sitemap", async () => {
    const { collection, user, team } = await publicFixture();
    env.URL = "http://exwebsite.test:8090/docs";
    const visible = await buildDocument({
      collectionId: collection.id,
      teamId: team.id,
      userId: user.id,
    });
    const draft = await buildDocument({
      collectionId: collection.id,
      teamId: team.id,
      userId: user.id,
      publishedAt: null,
    });
    const privateDocument = await buildDocument();
    const response = await server.get("/sitemap.xml");
    expect(response.status).toBe(200);
    const xml = await response.text();
    expect(xml).toContain(`http://exwebsite.test:8090/docs${visible.path}`);
    expect(xml).not.toContain(draft.path);
    expect(xml).not.toContain(privateDocument.path);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("renders public deep links with indexable text and canonical docs URLs", async () => {
    const { collection, user, team } = await publicFixture();
    env.URL = "http://exwebsite.test:8090/docs";
    const document = await buildDocument({
      collectionId: collection.id,
      teamId: team.id,
      userId: user.id,
      title: "Public SSR fixture",
      text: "Indexable public fixture body\n\n[Related document](/doc/related-AbCdEfGhIj)\n\n![Fixture image](/api/attachments.redirect?id=fixture)",
    });
    const response = await server.get(document.path);
    const html = await response.text();
    expect(html).not.toContain("/docs/docs/");
    expect(html).toContain('href="/docs/static/manifest.webmanifest"');
    expect(html).toContain('href="/docs/images/favicon-32.png"');
    expect(html).toContain('href="/docs/opensearch.xml"');
    // TestServer represents the backend after the gateway strips one /docs.
    for (const mounted of [
      "/docs/images/favicon-32.png",
      "/docs/images/icon-maskable-192.png",
      "/docs/opensearch.xml",
    ]) {
      const asset = await server.get(mounted.slice("/docs".length));
      expect(asset.status, mounted).toBe(200);
      const head = await server.head(mounted.slice("/docs".length));
      expect(head.status, mounted).toBe(200);
    }
    expect(response.status).toBe(200);
    expect(html).toContain("Public SSR fixture");
    expect(html).toContain("Indexable public fixture body");
    expect(html).toContain(
      "http://exwebsite.test:8090/docs/doc/related-AbCdEfGhIj"
    );
    expect(html).toContain("/docs/api/attachments.redirect?id=fixture");
    expect(html).toContain(`http://exwebsite.test:8090/docs${document.path}`);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const privateDocument = await buildDocument();
    expect((await server.get(privateDocument.path)).status).toBe(404);
  });
  it("rejects unknown and invalid public request fields", async () => {
    for (const { path, body } of [
      { path: "public.collections.list", body: { secret: true } },
      { path: "public.collections.list", body: { limit: 101 } },
      { path: "public.documents.search", body: { query: "   " } },
      { path: "public.documents.info", body: { id: "" } },
    ]) {
      const response = await server.post(`/api/${path}`, { body });
      expect(response.status).toBe(400);
    }
  });

  it("lists only the initialized workspace public collections without private metadata", async () => {
    const { collection } = await publicFixture();
    const other = await buildCollection({ sharing: true });
    await buildShare({
      collectionId: other.id,
      teamId: other.teamId,
      published: true,
    });
    const response = await server.post("/api/public.collections.list", {
      body: {},
    });
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data).toEqual([
      {
        id: collection.id,
        name: collection.name,
        description: collection.description,
        url: `/public/collection/${collection.id}`,
      },
    ]);
    expect(body.pagination).toEqual({ offset: 0, limit: 20, hasMore: false });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("filters drafts before paging and promotes children whose parent is hidden", async () => {
    const { collection, user, team } = await publicFixture();
    const draft = await buildDocument({
      collectionId: collection.id,
      teamId: team.id,
      createdById: user.id,
      publishedAt: null,
      title: "private draft",
    });
    const visible = await buildDocument({
      collectionId: collection.id,
      teamId: team.id,
      createdById: user.id,
      publishedAt: new Date(),
      parentDocumentId: draft.id,
      title: "public child",
    });
    const response = await server.post("/api/public.documents.list", {
      body: { collectionId: collection.id, limit: 1 },
      headers: { Cookie: "exdocs_access=expired-cookie" },
    });
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.data).toEqual([
      {
        id: visible.id,
        title: "public child",
        url: visible.path,
        parentDocumentId: null,
        updatedAt: visible.updatedAt.toISOString(),
      },
    ]);
    expect(body.pagination).toEqual({ offset: 0, limit: 1, hasMore: false });
    expect(JSON.stringify(body)).not.toContain("private draft");
  });

  it("returns the same 404 for private, draft and missing documents and rechecks revoked shares", async () => {
    const { collection, user, team } = await publicFixture();
    const visible = await buildDocument({
      collectionId: collection.id,
      teamId: team.id,
      createdById: user.id,
      publishedAt: new Date(),
      title: "public fixture",
    });
    const draft = await buildDocument({
      collectionId: collection.id,
      teamId: team.id,
      createdById: user.id,
      publishedAt: null,
    });
    const other = await buildDocument();
    for (const id of [draft.id, other.id, randomUUID()]) {
      expect(
        (await server.post("/api/public.documents.info", { body: { id } }))
          .status
      ).toBe(404);
    }
    expect(
      (
        await server.post("/api/public.documents.info", {
          body: { id: visible.id },
        })
      ).status
    ).toBe(200);
    const { Share } = await import("@server/models");
    await Share.update(
      { revokedAt: new Date() },
      { where: { collectionId: collection.id } }
    );
    expect(
      (
        await server.post("/api/public.documents.info", {
          body: { id: visible.id },
        })
      ).status
    ).toBe(404);
  });
});
