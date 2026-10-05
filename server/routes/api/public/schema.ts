import { z } from "zod";
import { BaseSchema } from "../schema";

const Page = z.object({
  offset: z.number().int().min(0).default(0),
  limit: z.number().int().min(1).max(100).default(20),
});
export const PublicCollectionsListSchema = BaseSchema.extend({
  body: Page.strict(),
});
export const PublicDocumentsListSchema = BaseSchema.extend({
  body: Page.extend({ collectionId: z.uuid() }).strict(),
});
export const PublicDocumentInfoSchema = BaseSchema.extend({
  body: z.object({ id: z.string().min(1).max(512) }).strict(),
});
export const PublicDocumentsSearchSchema = BaseSchema.extend({
  body: Page.extend({
    query: z.string().trim().min(1).max(200),
    collectionId: z.uuid().optional(),
  }).strict(),
});

export type CollectionsRequest = z.infer<typeof PublicCollectionsListSchema>;
export type DocumentsRequest = z.infer<typeof PublicDocumentsListSchema>;
export type InfoRequest = z.infer<typeof PublicDocumentInfoSchema>;
export type SearchRequest = z.infer<typeof PublicDocumentsSearchSchema>;
