import { existsSync, copyFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import FormData from "form-data";
import { ensureDirSync } from "fs-extra";
import JWT from "jsonwebtoken";
import { CSRF } from "@shared/constants";
import { FileOperationState, FileOperationType } from "@shared/types";
import env from "@server/env";
import WebsiteIdentityClient from "@server/identity/WebsiteIdentityClient";
import { issueExternalSessionToken } from "@server/identity/authenticateExternalSession";
import AttachmentHelper, {
  Buckets,
} from "@server/models/helpers/AttachmentHelper";
import FileStorage from "@server/storage/files";
import {
  buildAttachment,
  buildFileOperation,
  buildUser,
} from "@server/test/factories";
import { getTestServer } from "@server/test/support";
import {
  ExternalIdentity,
  ExternalSession,
  WebsiteIntegration,
} from "@server/models";
import { parser } from "@server/editor";
import { bundleToken, generateRawToken } from "@server/utils/csrf";
import {
  buildCollection,
  buildDocument,
  buildShare,
  buildTeam,
} from "@server/test/factories";

const server = getTestServer();

// Increase timeout for all tests in this file
vi.setConfig({ testTimeout: 10000 });

describe("#files.create", () => {
  it("should fail with status 400 bad request if key is invalid", async () => {
    const user = await buildUser();
    const res = await server.post("/api/files.create", user, {
      body: {
        key: "public/foo/bar/baz.png",
      },
    });
    expect(res.status).toEqual(400);
  });

  it("should fail with status 401 if associated attachment does not belong to user", async () => {
    const user = await buildUser();
    const fileName = "images.docx";
    const attachment = await buildAttachment(
      {
        teamId: user.teamId,
        contentType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      },
      fileName
    );

    const content = await readFile(
      path.resolve(__dirname, "..", "test", "fixtures", fileName)
    );
    const form = new FormData();
    form.append("key", attachment.key);
    form.append("file", content, fileName);
    const res = await server.post(`/api/files.create`, user, {
      headers: form.getHeaders(),
      body: form,
    });
    expect(res.status).toEqual(403);
  });

  it("should fail with status 401 if file exists on disk", async () => {
    const user = await buildUser();
    const fileName = "images.docx";
    const attachment = await buildAttachment(
      {
        userId: user.id,
        teamId: user.teamId,
        contentType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      },
      fileName
    );

    ensureDirSync(
      path.dirname(path.join(env.FILE_STORAGE_LOCAL_ROOT_DIR, attachment.key))
    );

    copyFileSync(
      path.resolve(__dirname, "..", "test", "fixtures", fileName),
      path.join(env.FILE_STORAGE_LOCAL_ROOT_DIR, attachment.key)
    );

    const content = await readFile(
      path.resolve(__dirname, "..", "test", "fixtures", fileName)
    );
    const form = new FormData();
    form.append("key", attachment.key);
    form.append("file", content, fileName);
    const res = await server.post(`/api/files.create`, user, {
      headers: form.getHeaders(),
      body: form,
    });
    expect(res.status).toEqual(400);
  });

  it("should fail with status 400 if uploaded file exceeds declared size", async () => {
    const user = await buildUser();
    const fileName = "images.docx";
    const attachment = await buildAttachment(
      {
        teamId: user.teamId,
        userId: user.id,
        size: 100,
        contentType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      },
      fileName
    );

    const content = await readFile(
      path.resolve(__dirname, "..", "test", "fixtures", fileName)
    );
    const form = new FormData();
    form.append("key", attachment.key);
    form.append("file", content, fileName);
    const res = await server.post(`/api/files.create`, user, {
      headers: form.getHeaders(),
      body: form,
    });
    expect(res.status).toEqual(400);
    expect(
      existsSync(path.join(env.FILE_STORAGE_LOCAL_ROOT_DIR, attachment.key))
    ).toBe(false);
  });

  it("should update attachment size to actual uploaded bytes", async () => {
    const user = await buildUser();
    const fileName = "images.docx";
    const attachment = await buildAttachment(
      {
        teamId: user.teamId,
        userId: user.id,
        size: 1_000_000,
        contentType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      },
      fileName
    );

    const content = await readFile(
      path.resolve(__dirname, "..", "test", "fixtures", fileName)
    );
    const form = new FormData();
    form.append("key", attachment.key);
    form.append("file", content, fileName);
    const res = await server.post(`/api/files.create`, user, {
      headers: form.getHeaders(),
      body: form,
    });
    expect(res.status).toEqual(200);

    await attachment.reload();
    expect(Number(attachment.size)).toEqual(content.byteLength);
  });

  it("should succeed with status 200 ok and create a file", async () => {
    const user = await buildUser();
    const fileName = "images.docx";
    const attachment = await buildAttachment(
      {
        teamId: user.teamId,
        userId: user.id,
        contentType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      },
      fileName
    );

    const content = await readFile(
      path.resolve(__dirname, "..", "test", "fixtures", fileName)
    );
    const form = new FormData();
    form.append("key", attachment.key);
    form.append("file", content, fileName);
    const res = await server.post(`/api/files.create`, user, {
      headers: form.getHeaders(),
      body: form,
    });

    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.success).toEqual(true);
    expect(
      existsSync(path.join(env.FILE_STORAGE_LOCAL_ROOT_DIR, attachment.key))
    ).toBe(true);
  });

  it("should succeed with a valid upload signature and no session", async () => {
    const user = await buildUser();
    const fileName = "images.docx";
    const attachment = await buildAttachment(
      {
        teamId: user.teamId,
        userId: user.id,
        contentType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      },
      fileName
    );

    const sig = JWT.sign(
      { key: attachment.key, type: "attachment-upload" },
      env.SECRET_KEY,
      { expiresIn: 3600 }
    );

    const content = await readFile(
      path.resolve(__dirname, "..", "test", "fixtures", fileName)
    );
    const form = new FormData();
    form.append("key", attachment.key);
    form.append("file", content, fileName);
    form.append("sig", sig);

    const res = await server.post(`/api/files.create`, {
      headers: form.getHeaders(),
      body: form,
    });

    const body = await res.json();
    expect(res.status).toEqual(200);
    expect(body.success).toEqual(true);
    expect(
      existsSync(path.join(env.FILE_STORAGE_LOCAL_ROOT_DIR, attachment.key))
    ).toBe(true);
  });

  it("should fail with a signature scoped to a different key", async () => {
    const user = await buildUser();
    const fileName = "images.docx";
    const attachment = await buildAttachment(
      {
        teamId: user.teamId,
        userId: user.id,
        contentType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      },
      fileName
    );

    const sig = JWT.sign(
      { key: "public/foo/bar/other.png", type: "attachment-upload" },
      env.SECRET_KEY,
      { expiresIn: 3600 }
    );

    const content = await readFile(
      path.resolve(__dirname, "..", "test", "fixtures", fileName)
    );
    const form = new FormData();
    form.append("key", attachment.key);
    form.append("file", content, fileName);
    form.append("sig", sig);

    const res = await server.post(`/api/files.create`, {
      headers: form.getHeaders(),
      body: form,
    });
    expect(res.status).toEqual(401);
    expect(
      existsSync(path.join(env.FILE_STORAGE_LOCAL_ROOT_DIR, attachment.key))
    ).toBe(false);
  });

  it("should fail with status 401 when neither session nor signature is provided", async () => {
    const user = await buildUser();
    const fileName = "images.docx";
    const attachment = await buildAttachment(
      {
        teamId: user.teamId,
        userId: user.id,
        contentType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      },
      fileName
    );

    const content = await readFile(
      path.resolve(__dirname, "..", "test", "fixtures", fileName)
    );
    const form = new FormData();
    form.append("key", attachment.key);
    form.append("file", content, fileName);

    const res = await server.post(`/api/files.create`, {
      headers: form.getHeaders(),
      body: form,
    });
    expect(res.status).toEqual(401);
  });
});

describe("integrated local uploads", () => {
  async function fixture() {
    const issuer = "http://identity.exwebsite.test:8090/";
    process.env.HYDRA_PUBLIC_URL = issuer;
    process.env.WEBSITE_INTERNAL_URL = "http://127.0.0.1:18766/";
    process.env.OUTLINE_INTEGRATION_KEY = "isolated-test-key";
    env.WEBSITE_INTEGRATION_ENABLED = true;
    const team = await buildTeam({ sharing: true });
    const user = await buildUser({ teamId: team.id });
    await WebsiteIntegration.create({
      key: "website",
      teamId: team.id,
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
    vi.spyOn(WebsiteIdentityClient.prototype, "check").mockResolvedValue({
      active: true,
      sessionId: websiteSessionId,
      userId: subject,
      expiresAt: Date.now() + 60_000,
      profile: {
        nickname: user.name,
        email: user.email ?? "uploader@example.test",
        avatarUrl: null,
        version: 0,
      },
    });
    const fileName = "avatar.jpg";
    const content = await readFile(
      path.resolve(__dirname, "..", "test", "fixtures", fileName)
    );
    const attachment = await buildAttachment(
      {
        teamId: team.id,
        userId: user.id,
        size: content.byteLength,
        contentType: "image/jpeg",
      },
      fileName
    );
    const sig = JWT.sign(
      { key: attachment.key, type: "attachment-upload" },
      env.SECRET_KEY,
      { expiresIn: 3600 }
    );
    const csrf = bundleToken(generateRawToken(16), env.SECRET_KEY);
    const form = () => {
      const body = new FormData();
      body.append("key", attachment.key);
      body.append("file", content, fileName);
      body.append("sig", sig);
      body.append(CSRF.fieldName, csrf);
      return body;
    };
    const cookie = `exdocs_access=${issueExternalSessionToken(session)}; ${CSRF.cookieName}=${csrf}`;
    return { attachment, session, team, fileName, content, form, cookie, csrf };
  }

  it("rejects an integrated signed upload without a Website cookie", async () => {
    const { attachment, form } = await fixture();
    const body = form();
    const response = await server.post("/api/files.create", {
      headers: body.getHeaders(),
      body,
    });
    expect(response.status).toBe(401);
    expect(
      existsSync(path.join(env.FILE_STORAGE_LOCAL_ROOT_DIR, attachment.key))
    ).toBe(false);
  });

  it("rejects a signed upload replayed after Website logout", async () => {
    const { attachment, session, form, cookie } = await fixture();
    await session.update({ revokedAt: new Date() });
    const body = form();
    const response = await server.post("/api/files.create", {
      headers: {
        ...body.getHeaders(),
        Cookie: cookie,
        Origin: new URL(env.URL).origin,
      },
      body,
    });
    expect(response.status).toBe(401);
    expect(
      existsSync(path.join(env.FILE_STORAGE_LOCAL_ROOT_DIR, attachment.key))
    ).toBe(false);
  });

  it("accepts a signed upload for its owner with a current Website session", async () => {
    const { attachment, form, cookie } = await fixture();
    const body = form();
    const response = await server.post("/api/files.create", {
      headers: {
        ...body.getHeaders(),
        Cookie: cookie,
        Origin: new URL(env.URL).origin,
      },
      body,
    });
    expect(response.status).toBe(200);
    expect((await response.json()).success).toBe(true);
    expect(
      existsSync(path.join(env.FILE_STORAGE_LOCAL_ROOT_DIR, attachment.key))
    ).toBe(true);
  });

  it("rejects a signed upload for another attachment owner", async () => {
    const { team, fileName, content, cookie, csrf } = await fixture();
    const other = await buildUser({ teamId: team.id });
    const attachment = await buildAttachment(
      {
        teamId: team.id,
        userId: other.id,
        size: content.byteLength,
        contentType: "image/jpeg",
      },
      fileName
    );
    const sig = JWT.sign(
      { key: attachment.key, type: "attachment-upload" },
      env.SECRET_KEY,
      { expiresIn: 3600 }
    );
    const body = new FormData();
    body.append("key", attachment.key);
    body.append("file", content, fileName);
    body.append("sig", sig);
    body.append(CSRF.fieldName, csrf);
    const response = await server.post("/api/files.create", {
      headers: {
        ...body.getHeaders(),
        Cookie: cookie,
        Origin: new URL(env.URL).origin,
      },
      body,
    });
    expect(response.status).toBe(403);
    expect(
      existsSync(path.join(env.FILE_STORAGE_LOCAL_ROOT_DIR, attachment.key))
    ).toBe(false);
  });

  it("retains upstream signed uploads without a session", async () => {
    const { attachment, form } = await fixture();
    const previous = env.WEBSITE_INTEGRATION_ENABLED;
    try {
      env.WEBSITE_INTEGRATION_ENABLED = false;
      const body = form();
      const response = await server.post("/api/files.create", {
        headers: body.getHeaders(),
        body,
      });
      expect(response.status).toBe(200);
      expect(
        existsSync(path.join(env.FILE_STORAGE_LOCAL_ROOT_DIR, attachment.key))
      ).toBe(true);
    } finally {
      env.WEBSITE_INTEGRATION_ENABLED = previous;
    }
  });
});

describe("#files.get", () => {
  it("should fail with status 404 if existing file is requested with key", async () => {
    const user = await buildUser();
    const fileName = "images.docx";
    const key = path.join("uploads", user.id, crypto.randomUUID(), fileName);

    ensureDirSync(
      path.dirname(path.join(env.FILE_STORAGE_LOCAL_ROOT_DIR, key))
    );

    copyFileSync(
      path.resolve(__dirname, "..", "test", "fixtures", fileName),
      path.join(env.FILE_STORAGE_LOCAL_ROOT_DIR, key)
    );

    const res = await server.get(`/api/files.get?key=${key}`);
    expect(res.status).toEqual(404);
  });

  it("should fail with status 404 if non-existing file is requested with key", async () => {
    const user = await buildUser();
    const fileName = "images.docx";
    const key = path.join("uploads", user.id, crypto.randomUUID(), fileName);
    const res = await server.get(`/api/files.get?key=${key}`);
    expect(res.status).toEqual(404);
  });

  it("should fail with status 400 bad request if key is invalid", async () => {
    const res = await server.get(`/api/files.get?key=public/foo/bar/baz.png`);
    expect(res.status).toEqual(400);
  });

  it("should fail with status 400 bad request if neither key or sig is supplied", async () => {
    const res = await server.get("/api/files.get");
    const body = await res.json();
    expect(res.status).toEqual(400);
    expect(body.message).toEqual("query: One of key or sig is required");
  });

  it("should succeed with status 200 ok when attachment is requested using key", async () => {
    const user = await buildUser();
    const fileName = "images.docx";

    const attachment = await buildAttachment(
      {
        acl: "public-read",
        key: AttachmentHelper.getKey({
          id: randomUUID(),
          name: fileName,
          userId: user.id,
        }).replace(Buckets.uploads, Buckets.public),
        teamId: user.teamId,
        userId: user.id,
        contentType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      },
      fileName
    );

    const content = await readFile(
      path.resolve(__dirname, "..", "test", "fixtures", fileName)
    );
    const form = new FormData();
    form.append("key", attachment.key);
    form.append("file", content, fileName);
    await server.post(`/api/files.create`, user, {
      headers: form.getHeaders(),
      body: form,
    });

    const res = await server.get(attachment.canonicalUrl);
    expect(res.status).toEqual(200);
    expect(res.headers.get("Content-Type")).toEqual(attachment.contentType);
    expect(res.headers.get("Content-Disposition")).toEqual(
      'attachment; filename="images.docx"'
    );
  });

  it("should succeed with status 200 ok when private attachment is requested using signature", async () => {
    const user = await buildUser();
    const fileName = "images.docx";

    const attachment = await buildAttachment(
      {
        teamId: user.teamId,
        userId: user.id,
        contentType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        acl: "private",
      },
      fileName
    );

    const content = await readFile(
      path.resolve(__dirname, "..", "test", "fixtures", fileName)
    );
    const form = new FormData();
    form.append("key", attachment.key);
    form.append("file", content, fileName);
    await server.post(`/api/files.create`, user, {
      headers: form.getHeaders(),
      body: form,
    });

    const url = new URL(await attachment.signedUrl);
    const res = await server.get(url.pathname + url.search);
    expect(res.status).toEqual(200);
    expect(res.headers.get("Content-Type")).toEqual(attachment.contentType);
    expect(res.headers.get("Content-Disposition")).toEqual(
      'attachment; filename="images.docx"'
    );
  });

  it("should succeed with status 200 ok when file is requested using signature", async () => {
    const user = await buildUser();
    const fileName = "images.docx";
    const { key } = await buildAttachment(
      {
        teamId: user.teamId,
        userId: user.id,
        contentType:
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        acl: "private",
      },
      fileName
    );
    const signedUrl = await FileStorage.getSignedUrl(key);

    ensureDirSync(
      path.dirname(path.join(env.FILE_STORAGE_LOCAL_ROOT_DIR, key))
    );

    copyFileSync(
      path.resolve(__dirname, "..", "test", "fixtures", fileName),
      path.join(env.FILE_STORAGE_LOCAL_ROOT_DIR, key)
    );

    const url = new URL(signedUrl);
    const res = await server.get(url.pathname + url.search);
    expect(res.status).toEqual(200);
    expect(res.headers.get("Content-Type")).toEqual(
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    expect(res.headers.get("Content-Disposition")).toEqual(
      'attachment; filename="images.docx"'
    );
  });

  it("should succeed with status 200 ok when avatar is requested using key", async () => {
    const user = await buildUser();
    const key = path.join("avatars", user.id, crypto.randomUUID());
    const attachment = await buildAttachment({
      key,
      teamId: user.teamId,
      userId: user.id,
      contentType: "image/jpg",
      acl: "public-read",
    });

    await attachment.destroy({
      hooks: false,
    });

    ensureDirSync(
      path.dirname(path.join(env.FILE_STORAGE_LOCAL_ROOT_DIR, key))
    );

    copyFileSync(
      path.resolve(__dirname, "..", "test", "fixtures", "avatar.jpg"),
      path.join(env.FILE_STORAGE_LOCAL_ROOT_DIR, key)
    );

    const res = await server.get(`/api/files.get?key=${key}`);
    expect(res.status).toEqual(200);
    expect(res.headers.get("Content-Disposition")).toEqual("attachment");
  });

  it("should succeed with status 200 ok when avatar is requested using key", async () => {
    const user = await buildUser();
    const key = path.join("avatars", user.id, crypto.randomUUID());
    await buildAttachment({
      key,
      teamId: user.teamId,
      userId: user.id,
      contentType: "image/jpg",
      acl: "public-read",
    });

    ensureDirSync(
      path.dirname(path.join(env.FILE_STORAGE_LOCAL_ROOT_DIR, key))
    );

    copyFileSync(
      path.resolve(__dirname, "..", "test", "fixtures", "avatar.jpg"),
      path.join(env.FILE_STORAGE_LOCAL_ROOT_DIR, key)
    );

    const res = await server.get(`/api/files.get?key=${key}`);
    expect(res.status).toEqual(200);
    expect(res.headers.get("Content-Type")).toEqual("image/jpg");
    expect(res.headers.get("Content-Disposition")).toEqual("attachment");
  });

  it("should succeed with status 200 ok when public-read avatar in uploads bucket is requested by non-owner", async () => {
    const owner = await buildUser();
    const otherUser = await buildUser({ teamId: owner.teamId });
    const key = AttachmentHelper.getKey({
      id: randomUUID(),
      name: "avatar.jpg",
      userId: owner.id,
    });
    await buildAttachment({
      key,
      teamId: owner.teamId,
      userId: owner.id,
      contentType: "image/jpg",
      acl: "public-read",
    });

    ensureDirSync(
      path.dirname(path.join(env.FILE_STORAGE_LOCAL_ROOT_DIR, key))
    );

    copyFileSync(
      path.resolve(__dirname, "..", "test", "fixtures", "avatar.jpg"),
      path.join(env.FILE_STORAGE_LOCAL_ROOT_DIR, key)
    );

    // Non-owner user should be able to access public-read attachment
    const res = await server.get(`/api/files.get?key=${key}`, {
      headers: {
        Authorization: `Bearer ${otherUser.getSessionToken()}`,
      },
    });
    expect(res.status).toEqual(200);
    expect(res.headers.get("Content-Type")).toEqual("image/jpg");
  });

  it("should fail with status 403 when private attachment in uploads bucket is requested by non-owner", async () => {
    const owner = await buildUser();
    const otherUser = await buildUser({ teamId: owner.teamId });
    const key = AttachmentHelper.getKey({
      id: randomUUID(),
      name: "document.pdf",
      userId: owner.id,
    });
    await buildAttachment({
      key,
      teamId: owner.teamId,
      userId: owner.id,
      contentType: "application/pdf",
      acl: "private",
    });

    ensureDirSync(
      path.dirname(path.join(env.FILE_STORAGE_LOCAL_ROOT_DIR, key))
    );

    copyFileSync(
      path.resolve(__dirname, "..", "test", "fixtures", "avatar.jpg"),
      path.join(env.FILE_STORAGE_LOCAL_ROOT_DIR, key)
    );

    // Non-owner user should NOT be able to access private attachment
    const res = await server.get(`/api/files.get?key=${key}`, {
      headers: {
        Authorization: `Bearer ${otherUser.getSessionToken()}`,
      },
    });
    expect(res.status).toEqual(403);
  });

  it("should succeed with status 200 ok when exported file is requested using signature", async () => {
    const previousIntegration = env.WEBSITE_INTEGRATION_ENABLED;
    env.WEBSITE_INTEGRATION_ENABLED = false;
    try {
      const user = await buildUser();
      const fileName = "export-markdown.zip";
      const key = `${Buckets.uploads}/${user.teamId}/${crypto.randomUUID()}/${fileName}`;

      await buildFileOperation({
        userId: user.id,
        teamId: user.teamId,
        type: FileOperationType.Export,
        state: FileOperationState.Complete,
        key,
      });

      ensureDirSync(
        path.dirname(path.join(env.FILE_STORAGE_LOCAL_ROOT_DIR, key))
      );

      copyFileSync(
        path.resolve(__dirname, "..", "test", "fixtures", fileName),
        path.join(env.FILE_STORAGE_LOCAL_ROOT_DIR, key)
      );

      const signedUrl = await FileStorage.getSignedUrl(key);
      const url = new URL(signedUrl);
      const res = await server.get(url.pathname + url.search);

      expect(res.status).toEqual(200);
      expect(res.headers.get("Content-Type")).toEqual("application/zip");
      expect(res.headers.get("Content-Disposition")).toEqual(
        'attachment; filename="export-markdown.zip"'
      );
    } finally {
      env.WEBSITE_INTEGRATION_ENABLED = previousIntegration;
    }
  });
});

describe("integrated local file reads", () => {
  it("rechecks public ownership and revocation for key, signed and Range reads", async () => {
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
    const share = await buildShare({
      teamId: team.id,
      userId: user.id,
      collectionId: collection.id,
      documentId: null,
      published: true,
    });
    const document = await buildDocument({
      teamId: team.id,
      userId: user.id,
      collectionId: collection.id,
    });
    const attachment = await buildAttachment(
      {
        teamId: team.id,
        userId: user.id,
        documentId: document.id,
        acl: "private",
        contentType: "image/jpg",
      },
      "avatar.jpg"
    );
    const redirectUrl = `/api/attachments.redirect?id=${attachment.id}`;
    await document.update({
      text: `![image](${redirectUrl})`,
      content: parser.parse(`![image](${redirectUrl})`)?.toJSON(),
    });
    const filePath = path.join(env.FILE_STORAGE_LOCAL_ROOT_DIR, attachment.key);
    ensureDirSync(path.dirname(filePath));
    copyFileSync(
      path.resolve(__dirname, "..", "test", "fixtures", "avatar.jpg"),
      filePath
    );

    const keyPath = `/api/files.get?key=${encodeURIComponent(attachment.key)}`;
    const publicRange = await server.get(keyPath, {
      headers: { Range: "bytes=0-3", Cookie: "exdocs_access=expired-cookie" },
    });
    expect(publicRange.status, await publicRange.text()).toBe(206);
    expect(publicRange.headers.get("cache-control")).toBe("no-store");

    const signed = new URL(await attachment.signedUrl);
    await share.update({ revokedAt: new Date() });
    const replay = await server.get(signed.pathname + signed.search, {
      headers: { Range: "bytes=0-3" },
    });
    expect(replay.status).toBe(404);
    expect((await server.get(keyPath)).status).toBe(404);
  });
});
