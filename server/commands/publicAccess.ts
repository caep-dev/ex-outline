import { QueryTypes } from "sequelize";
import isUUID from "validator/lib/isUUID";
import type { ProsemirrorData } from "@shared/types";
import type {
  PublicCollection,
  PublicDocument,
  PublicDocumentSearchResult,
  PublicPage,
} from "@shared/types/websiteIntegration";
import { UrlHelper } from "@shared/utils/UrlHelper";
import { publicBasePath, publicPath } from "@shared/utils/publicPath";
import env from "@server/env";
import { Document } from "@server/models";
import { DocumentHelper } from "@server/models/helpers/DocumentHelper";
import { sequelize } from "@server/storage/database";

interface PageOptions {
  offset: number;
  limit: number;
}
interface DocumentRow {
  id: string;
  title: string;
  urlId: string;
  parentDocumentId: string | null;
  updatedAt: Date;
}
interface SearchRow extends DocumentRow {
  collectionId: string;
  excerpt: string;
}

/**
 * Checks the current database public state of a collection in the fixed workspace.
 *
 * @param collectionId the collection UUID.
 * @returns whether the collection is currently public.
 */
export async function isPublicCollection(
  collectionId: string
): Promise<boolean> {
  if (!env.WEBSITE_INTEGRATION_ENABLED || !isUUID(collectionId)) {
    return false;
  }
  const rows = await sequelize.query<{ id: string }>(
    `SELECT c.id FROM ${collectionSource()} WHERE c.id = :id AND ${publicCollectionPredicate()}`,
    { type: QueryTypes.SELECT, replacements: { id: collectionId } }
  );
  return rows.length > 0;
}

/**
 * Returns the current public collections in the fixed integration workspace.
 *
 * @returns collection UUIDs whose current sharing state allows public reading.
 */
export async function publicCollectionIds(): Promise<string[]> {
  if (!env.WEBSITE_INTEGRATION_ENABLED) {
    return [];
  }
  const rows = await sequelize.query<{ id: string }>(
    `SELECT c.id FROM ${collectionSource()} WHERE ${publicCollectionPredicate()} ORDER BY c.id ASC`,
    { type: QueryTypes.SELECT }
  );
  return rows.map((row) => row.id);
}

/**
 * Resolves a UUID or validated document slug using current publication and collection state.
 *
 * @param idOrSlug the document UUID or document slug.
 * @returns the current public document, or null when invisible.
 */
export async function resolvePublicDocument(
  idOrSlug: string
): Promise<Document | null> {
  if (!env.WEBSITE_INTEGRATION_ENABLED) {
    return null;
  }
  const uuid = isUUID(idOrSlug);
  const slug = uuid ? undefined : UrlHelper.SLUG_URL_REGEX.exec(idOrSlug);
  if (!uuid && !slug) {
    return null;
  }
  const rows = await sequelize.query(
    `SELECT d.* FROM ${documentSource()} WHERE ${uuid ? "d.id" : 'd."urlId"'} = :id
      AND ${publicDocumentPredicate()} LIMIT 1`,
    {
      model: Document,
      mapToModel: true,
      replacements: { id: uuid ? idOrSlug : slug?.[1] },
    }
  );
  return rows[0] ?? null;
}

/**
 * Checks current public visibility without reusing a stale document or navigation tree.
 *
 * @param documentId the document UUID.
 * @returns whether the document is currently public.
 */
export async function isPublicDocument(documentId: string): Promise<boolean> {
  return (await resolvePublicDocument(documentId)) !== null;
}

/**
 * Lists only public collections, filtering in SQL before pagination.
 *
 * @param options the validated offset and page size.
 * @returns a page containing only current public collections.
 */
export async function listPublicCollections(
  options: PageOptions
): Promise<PublicPage<PublicCollection>> {
  const rows = await sequelize.query<Omit<PublicCollection, "url">>(
    `SELECT c.id, c.name, c.description FROM ${collectionSource()}
      WHERE ${publicCollectionPredicate()} ORDER BY c.name ASC, c.id ASC LIMIT :limit OFFSET :offset`,
    {
      type: QueryTypes.SELECT,
      replacements: { ...options, limit: options.limit + 1 },
    }
  );
  return page(
    rows.map((row) => ({ ...row, url: `/public/collection/${row.id}` })),
    options
  );
}

/**
 * Lists published documents and promotes each child to its nearest visible ancestor.
 *
 * @param collectionId the collection UUID.
 * @param options the validated offset and page size.
 * @returns a page of current public documents.
 */
export async function listPublicDocuments(
  collectionId: string,
  options: PageOptions
): Promise<PublicPage<PublicDocument>> {
  const rows = await sequelize.query<DocumentRow>(
    `SELECT d.id, d.title, d."urlId", d."updatedAt", (
      WITH RECURSIVE ancestors AS (
        SELECT p.id, p."parentDocumentId", p."publishedAt", p."deletedAt", p."archivedAt", p.template,
          1 AS depth, ARRAY[p.id] AS trail FROM ${table("documents")} p
          WHERE p.id = d."parentDocumentId" AND p."collectionId" = d."collectionId" AND p."teamId" = d."teamId"
        UNION ALL
        SELECT p.id, p."parentDocumentId", p."publishedAt", p."deletedAt", p."archivedAt", p.template,
          a.depth + 1, a.trail || p.id FROM ${table("documents")} p JOIN ancestors a ON p.id = a."parentDocumentId"
          WHERE p."collectionId" = d."collectionId" AND p."teamId" = d."teamId" AND NOT p.id = ANY(a.trail)
      ) SELECT id FROM ancestors WHERE "publishedAt" IS NOT NULL AND "deletedAt" IS NULL
          AND "archivedAt" IS NULL AND template = false ORDER BY depth LIMIT 1
    ) AS "parentDocumentId" FROM ${documentSource()}
      WHERE c.id = :collectionId AND ${publicDocumentPredicate()}
      ORDER BY d."updatedAt" DESC, d.id ASC LIMIT :limit OFFSET :offset`,
    {
      type: QueryTypes.SELECT,
      replacements: { ...options, collectionId, limit: options.limit + 1 },
    }
  );
  return page(
    rows.map((row) => ({
      id: row.id,
      title: row.title,
      url: Document.getPath(row),
      parentDocumentId: row.parentDocumentId,
      updatedAt: row.updatedAt.toISOString(),
    })),
    options
  );
}

/**
 * Searches the public PostgreSQL index with visibility enforced before results and pagination.
 *
 * @param query the validated search terms.
 * @param collectionId an optional collection UUID filter.
 * @param options the validated offset and page size.
 * @returns a page of current public search results.
 */
export async function searchPublicDocuments(
  query: string,
  collectionId: string | undefined,
  options: PageOptions
): Promise<PublicPage<PublicDocumentSearchResult>> {
  const rows = await sequelize.query<SearchRow>(
    `SELECT d.id, d.title, d."urlId", d."collectionId", ts_headline('english', coalesce(d.text, ''),
        websearch_to_tsquery('english', :query), 'StartSel="", StopSel="", MaxWords=35, MinWords=15, MaxFragments=1') AS excerpt
      FROM ${documentSource()} WHERE ${publicDocumentPredicate()}
        ${collectionId ? "AND c.id = :collectionId" : ""}
        AND d."searchVector" @@ websearch_to_tsquery('english', :query)
      ORDER BY ts_rank(d."searchVector", websearch_to_tsquery('english', :query)) DESC, d.id ASC
      LIMIT :limit OFFSET :offset`,
    {
      type: QueryTypes.SELECT,
      replacements: {
        ...options,
        query,
        collectionId: collectionId ?? null,
        limit: options.limit + 1,
      },
    }
  );
  return page(
    rows.map((row) => ({
      id: row.id,
      title: row.title,
      collectionId: row.collectionId,
      url: Document.getPath(row),
      excerpt: row.excerpt,
    })),
    options
  );
}

/**
 * Projects the public rich-text body without comment metadata or signed attachment URLs.
 *
 * @param document the document already resolved as public for this request.
 * @returns fresh public content whose internal assets remain under the docs mount.
 */
export async function publicDocumentContent(
  document: Document
): Promise<ProsemirrorData> {
  const data = structuredClone(
    await DocumentHelper.toJSON(document, { removeMarks: ["comment"] })
  );
  prefixPublicContent(data);
  return data;
}

function prefixPublicContent(node: ProsemirrorData) {
  const prefix = (attrs: Record<string, unknown> | undefined) => {
    if (!attrs) {
      return;
    }
    for (const key of ["href", "src", "url"]) {
      const value = attrs[key];
      if (
        typeof value === "string" &&
        /^\/(?:api\/|doc\/|collection\/|images\/|fonts\/)/.test(value)
      ) {
        attrs[key] = publicPath(publicBasePath(env.URL), value);
      }
    }
  };
  prefix(node.attrs);
  node.marks?.forEach((mark) => prefix(mark.attrs));
  node.content?.forEach(prefixPublicContent);
}

function table(name: string) {
  const schema = (env.DATABASE_SCHEMA ?? "public").replace(/"/g, '""');
  return `"${schema}"."${name}"`;
}

function collectionSource() {
  return `${table("collections")} c
    JOIN ${table("teams")} t ON t.id = c."teamId"
    JOIN ${table("website_integrations")} i ON i."teamId" = t.id AND i.key = 'website'`;
}

function publicCollectionPredicate() {
  return `c."deletedAt" IS NULL AND c."archivedAt" IS NULL AND c.sharing = true
    AND t."deletedAt" IS NULL AND t."suspendedAt" IS NULL AND t.sharing = true
    AND EXISTS (SELECT 1 FROM ${table("shares")} s WHERE s."collectionId" = c.id
      AND s."teamId" = c."teamId" AND s."documentId" IS NULL
      AND s.published = true AND s."revokedAt" IS NULL)`;
}

function documentSource() {
  return `${collectionSource()} JOIN ${table("documents")} d ON c.id = d."collectionId" AND c."teamId" = d."teamId"`;
}

function publicDocumentPredicate() {
  return `${publicCollectionPredicate()} AND d."publishedAt" IS NOT NULL
    AND d."deletedAt" IS NULL AND d."archivedAt" IS NULL AND d.template = false`;
}

function page<T>(rows: T[], options: PageOptions): PublicPage<T> {
  return {
    data: rows.slice(0, options.limit),
    pagination: {
      offset: options.offset,
      limit: options.limit,
      hasMore: rows.length > options.limit,
    },
  };
}
