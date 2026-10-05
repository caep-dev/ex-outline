import Router from "koa-router";
import type { Next } from "koa";
import {
  listPublicCollections,
  listPublicDocuments,
  resolvePublicDocument,
  searchPublicDocuments,
  publicDocumentContent,
} from "@server/commands/publicAccess";
import env from "@server/env";
import { NotFoundError } from "@server/errors";
import validate from "@server/middlewares/validate";
import type { APIContext } from "@server/types";
import * as T from "./schema";

const router = new Router();
async function publicRead(ctx: APIContext, next: Next) {
  ctx.set("Cache-Control", "no-store");
  if (!env.WEBSITE_INTEGRATION_ENABLED) {
    throw NotFoundError();
  }
  await next();
}

router.post(
  "public.collections.list",
  publicRead,
  validate(T.PublicCollectionsListSchema),
  async (ctx: APIContext<T.CollectionsRequest>) => {
    ctx.body = await listPublicCollections(ctx.input.body);
  }
);
router.post(
  "public.documents.list",
  publicRead,
  validate(T.PublicDocumentsListSchema),
  async (ctx: APIContext<T.DocumentsRequest>) => {
    const { collectionId, ...page } = ctx.input.body;
    ctx.body = await listPublicDocuments(collectionId, page);
  }
);
router.post(
  "public.documents.info",
  publicRead,
  validate(T.PublicDocumentInfoSchema),
  async (ctx: APIContext<T.InfoRequest>) => {
    const document = await resolvePublicDocument(ctx.input.body.id);
    if (!document) {
      throw NotFoundError();
    }
    ctx.body = {
      data: {
        id: document.id,
        collectionId: document.collectionId,
        title: document.title,
        content: await publicDocumentContent(document),
        url: document.path,
        updatedAt: document.updatedAt.toISOString(),
      },
    };
  }
);
router.post(
  "public.documents.search",
  publicRead,
  validate(T.PublicDocumentsSearchSchema),
  async (ctx: APIContext<T.SearchRequest>) => {
    const { query, collectionId, ...page } = ctx.input.body;
    ctx.body = await searchPublicDocuments(query, collectionId, page);
  }
);

export default router;
