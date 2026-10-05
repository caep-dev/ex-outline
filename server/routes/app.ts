import fs from "node:fs";
import path from "node:path";
import util from "node:util";
import type { Context, Next } from "koa";
import { escape } from "es-toolkit/compat";
import { Sequelize } from "sequelize";
import isUUID from "validator/lib/isUUID";
import { Node } from "prosemirror-model";
import {
  TeamPreference,
  type IntegrationType,
  type NavigationNode,
} from "@shared/types";
import { exuiTokens } from "@exre/exui/tokens";
import { unicodeCLDRtoBCP47, unicodeCLDRtoISO639 } from "@shared/utils/date";
import {
  developmentPublicUrl,
  publicBasePath,
  publicPath,
  publicUrl,
} from "@shared/utils/publicPath";
import { Hour } from "@shared/utils/time";
import env from "@server/env";
import { schema } from "@server/editor";
import { allowScriptSrc } from "@server/middlewares/csp";
import { Integration, WebsiteIntegration } from "@server/models";
import { DocumentHelper } from "@server/models/helpers/DocumentHelper";
import { ProsemirrorHelper } from "@server/models/helpers/ProsemirrorHelper";
import IntegrationHelper from "@server/models/helpers/IntegrationHelper";
import presentEnv from "@server/presenters/env";
import { getTeamFromContext } from "@server/utils/passport";
import prefetchTags from "@server/utils/prefetchTags";
import readManifestFile from "@server/utils/readManifestFile";
import { loadPublicShare } from "@server/commands/shareLoader";
import {
  listPublicCollections,
  listPublicDocuments,
  resolvePublicDocument,
  publicDocumentContent,
} from "@server/commands/publicAccess";
import { authenticateExternalSession } from "@server/identity/authenticateExternalSession";
import { SessionGuardError } from "@server/identity/SessionGuard";

const readFile = util.promisify(fs.readFile);
const entry = "app/index.tsx";
const publicBase = publicBasePath(env.URL);
const viteHost =
  process.env.WEBSITE_INTEGRATION_ENABLED === "true"
    ? env.URL
    : env.URL.replace(`:${env.PORT}`, ":3101");

let indexHtmlCache: Buffer | undefined;

/**
 * Renders indexable public content or a guarded private application shell.
 *
 * @param ctx the request context containing a document slug.
 * @param next the next route middleware.
 * @returns the rendered response, or an indistinguishable 404.
 * @throws when session verification or public storage is unavailable.
 */
export async function renderPublicDocument(ctx: Context, next: Next) {
  const document = await resolvePublicDocument(ctx.params.documentSlug);
  if (!document) {
    try {
      const identity = await authenticateExternalSession(ctx);
      if (identity) {
        return renderApp(ctx, next, { allowIndexing: false });
      }
    } catch (error) {
      if (!(error instanceof SessionGuardError) || error.status !== 401) {
        throw error;
      }
    }
    ctx.status = 404;
    ctx.set("Cache-Control", "no-store");
    return;
  }
  const data = await publicDocumentContent(document);
  const content = await ProsemirrorHelper.toHTML(Node.fromJSON(schema, data), {
    title: document.title,
    includeStyles: false,
    includeHead: false,
    baseUrl: env.URL,
  });
  return renderApp(ctx, next, {
    title: document.title,
    description: document.getSummary(),
    content,
    canonical: publicUrl(env.URL, document.path),
    allowIndexing: true,
  });
}

/**
 * Resolves a legacy collection share before redirecting to its public canonical page.
 *
 * @param ctx the legacy share request context.
 * @returns an uncached canonical redirect or an indistinguishable 404.
 * @throws when public storage is unavailable.
 */
export async function renderIntegratedShare(ctx: Context) {
  ctx.set("Cache-Control", "no-store");
  const integration = await WebsiteIntegration.findByPk("website");
  if (!integration) {
    ctx.status = 404;
    return;
  }
  try {
    const result = await loadPublicShare({
      id: ctx.params.shareId,
      documentId: ctx.params.documentSlug,
      teamId: integration.teamId,
    });
    if (!result.collection) {
      ctx.status = 404;
      return;
    }
    ctx.redirect(
      publicUrl(
        env.URL,
        result.document?.path ?? `/public/collection/${result.collection.id}`
      )
    );
    ctx.status = 308;
  } catch (error) {
    const status = (error as { status?: number }).status;
    if (status === 400 || status === 403 || status === 404) {
      ctx.status = 404;
      return;
    }
    throw error;
  }
}

/**
 * Enumerates current public document URLs through the public visibility resolver.
 *
 * @param ctx the sitemap request context.
 * @returns a sitemap response without private documents or caching.
 */
export async function renderPublicSitemap(ctx: Context) {
  const urls: string[] = [];
  for (let offset = 0; ; offset += 100) {
    const collections = await listPublicCollections({ offset, limit: 100 });
    for (const collection of collections.data) {
      for (let documentOffset = 0; ; documentOffset += 100) {
        const documents = await listPublicDocuments(collection.id, {
          offset: documentOffset,
          limit: 100,
        });
        urls.push(
          ...documents.data.map(
            (document) =>
              `<url><loc>${escape(publicUrl(env.URL, document.url))}</loc></url>`
          )
        );
        if (!documents.pagination.hasMore) {
          break;
        }
      }
    }
    if (!collections.pagination.hasMore) {
      break;
    }
  }
  ctx.type = "application/xml";
  ctx.set("Cache-Control", "no-store");
  ctx.body = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join("")}</urlset>`;
}

/**
 * Formats navigation tree children as markdown list items.
 *
 * @param children Array of navigation nodes
 * @param baseUrl Base URL for generating links
 * @returns Formatted markdown string
 */
function formatChildDocumentsAsMarkdown(
  children: NavigationNode[],
  baseUrl: string
): string {
  if (!children || children.length === 0) {
    return "";
  }

  const lines = children.map((child) => {
    const url = baseUrl + child.url;
    return `- [${child.title}](${url})`;
  });

  return `\n\n---\n\n**Documents**\n\n${lines.join("\n")}`;
}

const readIndexFile = async (): Promise<Buffer> => {
  if (env.isProduction || env.isTest) {
    if (indexHtmlCache) {
      return indexHtmlCache;
    }
  }

  if (env.isTest) {
    return await readFile(path.join(__dirname, "../static/index.html"));
  }

  if (env.isDevelopment) {
    return await readFile(
      path.join(__dirname, "../../../server/static/index.html")
    );
  }

  return (indexHtmlCache = await readFile(
    path.join(__dirname, "../../app/index.html")
  ));
};

export const renderApp = async (
  ctx: Context,
  next: Next,
  options: {
    title?: string;
    description?: string;
    content?: string;
    canonical?: string;
    shortcutIcon?: string;
    rootShareId?: string;
    isShare?: boolean;
    markdownUrl?: string;
    analytics?: Integration<IntegrationType.Analytics>[];
    allowIndexing?: boolean;
  } = {}
) => {
  const {
    title = env.APP_NAME,
    description = "A modern team knowledge base for your internal documentation, product specs, support answers, meeting notes, onboarding, &amp; more…",
    canonical = "",
    content = "",
    shortcutIcon = `${env.CDN_URL || ""}${publicPath(publicBase, "/images/favicon-32.png")}`,
    allowIndexing = true,
  } = options;

  if (ctx.request.path === "/realtime/") {
    return next();
  }

  allowScriptSrc(
    ctx,
    IntegrationHelper.getAnalyticsScriptSrc(options.analytics)
  );

  const { shareId } = ctx.params;
  const page = await readIndexFile();
  const publicUrl =
    env.isDevelopment && !env.WEBSITE_INTEGRATION_ENABLED
      ? developmentPublicUrl(
          env.URL,
          ctx.get("X-Website-Docs-Origin"),
          (process.env.OUTLINE_DEV_MOUNT_ORIGINS || "")
            .split(",")
            .filter(Boolean)
        )
      : env.URL;
  const basePath = publicBasePath(publicUrl);
  const publicEnvironment = {
    ...presentEnv(env, options),
    URL: publicUrl,
    CDN_URL: env.CDN_URL || basePath,
    COLLABORATION_URL:
      publicUrl === env.URL || process.env.COLLABORATION_URL
        ? env.COLLABORATION_URL
        : publicUrl.replace(/^http/, "ws"),
  };
  const initialThemePalette = env.WEBSITE_INTEGRATION_ENABLED
    ? {
        light: exuiTokens.themes.light.surface.background,
        dark: exuiTokens.themes.dark.surface.background,
      }
    : undefined;
  const environment = `
    <script nonce="${ctx.state.cspNonce}">
      window.env = ${JSON.stringify(publicEnvironment).replace(
        /</g,
        "\\u003c"
      )};
      window.websiteThemePalette = ${JSON.stringify(initialThemePalette)?.replace(/</g, "\\u003c") ?? "undefined"};
    </script>
  `;

  const scriptTags = env.isProduction
    ? `<script type="module" nonce="${ctx.state.cspNonce}" src="${
        env.CDN_URL || ""
      }${publicPath(publicBase, `/static/${readManifestFile()[entry]["file"]}`)}"></script>`
    : `<script type="module" nonce="${ctx.state.cspNonce}">
        import RefreshRuntime from "${viteHost}/static/@react-refresh"
        RefreshRuntime.injectIntoGlobalHook(window)
        window.$RefreshReg$ = () => { }
        window.$RefreshSig$ = () => (type) => type
        window.__vite_plugin_react_preamble_installed__ = true
      </script>
      <script type="module" nonce="${ctx.state.cspNonce}" src="${viteHost}/static/@vite/client"></script>
      <script type="module" nonce="${ctx.state.cspNonce}" src="${viteHost}/static/${entry}"></script>
    `;

  const alternateTag = options.markdownUrl
    ? `<link rel="alternate" type="text/markdown" href="${escape(options.markdownUrl)}" />`
    : "";

  let headTags = `
    <meta name="robots" content="${allowIndexing ? "index, follow" : "noindex, nofollow"}" />
    <link rel="canonical" href="${escape(canonical)}" />
    ${alternateTag}
    <link
      rel="shortcut icon"
      type="image/png"
      href="${escape(shortcutIcon)}"
      sizes="32x32"
    />
    `;

  if (options.isShare) {
    headTags += `
    <link rel="sitemap" type="application/xml" href="${publicPath(publicBase, "/api/shares.sitemap")}?id=${escape(options.rootShareId || shareId)}">
    `;
  } else {
    headTags += prefetchTags;
    headTags += `
    <link rel="manifest" href="${publicPath(publicBase, "/static/manifest.webmanifest")}" />
    <link
      rel="apple-touch-icon"
      type="image/png"
      href="${env.CDN_URL ?? ""}${publicPath(publicBase, "/images/icon-maskable-192.png")}"
      sizes="192x192"
    />
    <link
      rel="apple-touch-icon"
      type="image/png"
      href="${env.CDN_URL ?? ""}${publicPath(publicBase, "/images/icon-maskable-512.png")}"
      sizes="512x512"
    />
    <link
      rel="apple-touch-icon"
      type="image/png"
      href="${env.CDN_URL ?? ""}${publicPath(publicBase, "/images/icon-maskable-1024.png")}"
      sizes="1024x1024"
    />
    <link
      rel="search"
      type="application/opensearchdescription+xml"
      href="${publicPath(publicBase, "/opensearch.xml")}"
      title="Outline"
    />
    `;
  }

  // Advertise the markdown representation so that clients can discover it from
  // the response headers alone, without parsing the page.
  if (options.markdownUrl) {
    ctx.response.set(
      "Link",
      `<${options.markdownUrl}>; rel="alternate"; type="text/markdown"`
    );
  }

  if (basePath) {
    headTags = headTags.replace(
      /\b(href|src)="(\/(?!\/)[^"]*)"/g,
      (_attribute, name: string, url: string) =>
        `${name}="${publicPath(basePath, url)}"`
    );
  }

  // Ensure no caching is performed
  ctx.response.set(
    "Cache-Control",
    env.WEBSITE_INTEGRATION_ENABLED ? "no-store" : "no-cache, must-revalidate"
  );
  ctx.response.set("Expires", "-1");

  ctx.body = page
    .toString()
    .replace(/\{env\}/g, environment)
    .replace(
      /\{lang\}/g,
      env.WEBSITE_INTEGRATION_ENABLED
        ? unicodeCLDRtoBCP47(env.DEFAULT_LANGUAGE)
        : unicodeCLDRtoISO639(env.DEFAULT_LANGUAGE)
    )
    .replace(/\{title\}/g, escape(title))
    .replace(/\{description\}/g, escape(description))
    .replace(/\{content\}/g, content)
    .replace(/\{cdn-url\}/g, env.CDN_URL || basePath)
    .replace(/\{head-tags\}/g, headTags)
    .replace(/\{slack-app-id\}/g, env.public.SLACK_APP_ID || "")
    .replace(/\{script-tags\}/g, scriptTags)
    .replace(/\{csp-nonce\}/g, ctx.state.cspNonce);
};

export const renderShare = async (ctx: Context, next: Next) => {
  const rootShareId = ctx.state?.rootShare?.id;
  const shareId = rootShareId ?? ctx.params.shareId;
  const collectionSlug = ctx.params.collectionSlug;
  const documentSlug = ctx.params.documentSlug;

  // The response depends on the Accept header, caches must key on it.
  ctx.vary("Accept");

  // Find the share record if published so that the document title can be returned
  // in the server-rendered HTML. This allows it to appear in unfurls more reliably.
  let share, collection, document, team;
  let analytics: Integration<IntegrationType.Analytics>[] = [];

  let sharedTree;
  try {
    team = await getTeamFromContext(ctx, { includeOAuthState: false });
    const result = await loadPublicShare({
      id: shareId,
      collectionId: collectionSlug,
      documentId: documentSlug,
      teamId: team?.id,
    });
    share = result.share;
    collection = result.collection;
    document = result.document;
    sharedTree = result.sharedTree;

    if (isUUID(shareId) && share?.urlId) {
      // Redirect temporarily because the url slug
      // can be modified by the user at any time
      ctx.redirect(share.canonicalUrl);
      ctx.status = 307;
      return;
    }

    analytics = await Integration.findAnalyticsIntegrationsForTeam(
      share.teamId
    );

    if (share && !ctx.userAgent.isBot) {
      await share.update(
        {
          lastAccessedAt: new Date(),
          views: Sequelize.literal("views + 1"),
        },
        {
          hooks: false,
        }
      );
    }
  } catch (_err) {
    // If the share or document does not exist, return a 404.
    ctx.status = 404;
  }

  // The markdown representation lives at the same path with a .md suffix, only
  // on the routes that accept a format suffix.
  const markdownPath = ctx.params.shareId
    ? `/s/${ctx.params.shareId}${documentSlug ? `/doc/${documentSlug}` : ""}`
    : undefined;
  const markdownUrl =
    markdownPath && markdownPath === ctx.request.path
      ? `${ctx.request.URL.origin}${markdownPath}.md`
      : undefined;

  // If the client explicitly requests markdown and prefers it over HTML,
  // or the URL path ends with .md, return the document as markdown. This is
  // useful for LLMs and API clients.
  const acceptHeader = ctx.request.headers.accept || "";
  const prefersMarkdown =
    ctx.params.format === "md" ||
    (acceptHeader.includes("text/markdown") &&
      ctx.accepts("text/markdown", "text/html") === "text/markdown");

  if (prefersMarkdown && (document || collection)) {
    let markdown = await DocumentHelper.toMarkdown(document || collection!, {
      includeTitle: true,
      signedUrls: 86400, // 24 hours
      teamId: team?.id,
      commonMark: true,
    });

    // Append child documents list if the share includes them
    if (share?.includeChildDocuments && sharedTree) {
      const node = document
        ? (collection?.getDocumentTree(document.id) ?? sharedTree)
        : sharedTree;

      if (node?.children?.length) {
        markdown += formatChildDocumentsAsMarkdown(
          node.children,
          share.canonicalUrl
        );
      }
    }

    ctx.type = "text/markdown";
    ctx.response.set("Cache-Control", "no-cache, must-revalidate");
    ctx.response.set("Expires", "-1");
    ctx.body = markdown;
    return;
  }

  // Allow shares to be embedded in iframes on other websites unless prevented by team preference
  const preventEmbedding =
    team?.getPreference(TeamPreference.PreventDocumentEmbedding) ?? false;
  if (!preventEmbedding) {
    ctx.remove("X-Frame-Options");
  }

  const publicBranding =
    team?.getPreference(TeamPreference.PublicBranding) ?? false;

  const title = document
    ? document.title
    : collection
      ? collection.name
      : publicBranding && team?.name
        ? team.name
        : undefined;

  const content =
    document || collection
      ? await DocumentHelper.toHTML(document || collection!, {
          includeStyles: false,
          includeHead: false,
          includeTitle: true,
          signedUrls: Hour.seconds,
        })
      : undefined;

  const canonicalUrl =
    share && share.canonicalUrl !== ctx.request.origin + ctx.request.url
      ? `${share.canonicalUrl}${
          documentSlug && document
            ? document.path
            : collectionSlug && collection
              ? collection.path
              : ""
        }`
      : undefined;

  // Inject share information in SSR HTML
  return renderApp(ctx, next, {
    title,
    description:
      document?.getSummary() ||
      (publicBranding && team?.description ? team.description : undefined),
    content,
    shortcutIcon:
      publicBranding && team?.avatarUrl
        ? ((await team.publicAvatarUrl()) ?? undefined)
        : undefined,
    analytics,
    isShare: true,
    rootShareId,
    canonical: canonicalUrl,
    allowIndexing: share?.allowIndexing,
    markdownUrl: document || collection ? markdownUrl : undefined,
  });
};
