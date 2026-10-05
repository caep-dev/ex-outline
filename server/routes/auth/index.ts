import { randomBytes } from "node:crypto";
import passport from "@outlinewiki/koa-passport";
import { addMonths } from "date-fns";
import Koa from "koa";
import bodyParser from "koa-body";
import Router from "koa-router";
import env from "@server/env";
import { AuthenticationError } from "@server/errors";
import {
  websiteIdentityClient,
  issueExternalSessionToken,
} from "@server/identity/authenticateExternalSession";
import {
  beginWebsiteOidc,
  completeWebsiteOidc,
  safeReturnPath,
  WebsiteOidcFlowError,
} from "@server/identity/websiteOidc";
import { websiteIntegrationConfig } from "@server/identity/config";
import { provisionWebsiteSession } from "@server/identity/websiteProvisioner";
import authMiddleware from "@server/middlewares/authentication";
import coalesceBody from "@server/middlewares/coaleseBody";
import { Collection, Team, View, WebsiteIntegration } from "@server/models";
import AuthenticationHelper from "@server/models/helpers/AuthenticationHelper";
import type { AppState, AppContext, APIContext } from "@server/types";
import { AuthenticationType } from "@server/types";
import { verifyCSRFToken } from "@server/middlewares/csrf";
import { getJWTPayload } from "@server/utils/jwt";

const app = new Koa<AppState, AppContext>();
const router = new Router();

router.use(passport.initialize());

// dynamically register available authentication provider routes
void (async () => {
  if (env.WEBSITE_INTEGRATION_ENABLED) {
    return;
  }
  for (const provider of AuthenticationHelper.providers) {
    const resolvedRouter = await provider.value.router;
    if (resolvedRouter) {
      router.use(
        "/",
        authMiddleware({ optional: true }),
        resolvedRouter.routes()
      );
    }
  }
})();

router.get("/oidc", async (ctx) => {
  if (!env.WEBSITE_INTEGRATION_ENABLED) {
    ctx.status = 404;
    return;
  }
  ctx.set("Cache-Control", "no-store");
  const cookieName = `exdocs_oidc_${websiteIntegrationConfig().clientId}`;
  const cookieOptions = {
    path: "/docs/auth",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: new URL(env.URL).protocol === "https:",
    overwrite: true,
    signed: false,
  };
  const returnPath = safeReturnPath(ctx.query.returnTo);
  try {
    if (!(await WebsiteIntegration.findByPk("website"))) {
      throw new Error("Docs workspace is not initialized");
    }
    const binding = randomBytes(32).toString("base64url");
    const url = await beginWebsiteOidc(returnPath, binding);
    ctx.cookies.set(cookieName, binding, { ...cookieOptions, maxAge: 600_000 });
    ctx.redirect(url.toString());
  } catch {
    ctx.cookies.set(cookieName, null, cookieOptions);
    ctx.redirect(`${returnPath}#website-signin-unavailable`);
  }
});

router.get("/oidc.callback", async (ctx) => {
  if (!env.WEBSITE_INTEGRATION_ENABLED) {
    ctx.status = 404;
    return;
  }
  ctx.set("Cache-Control", "no-store");
  const cookieName = `exdocs_oidc_${websiteIntegrationConfig().clientId}`;
  const browserBinding = ctx.cookies.get(cookieName, { signed: false });
  // Clear the browser proof on every result, including a rejected foreign callback.
  ctx.cookies.set(cookieName, null, {
    path: "/docs/auth",
    httpOnly: true,
    sameSite: "lax",
    secure: new URL(env.URL).protocol === "https:",
    overwrite: true,
    signed: false,
  });
  let returnPath = "/docs/";
  try {
    const identity = await completeWebsiteOidc(ctx.querystring, browserBinding);
    returnPath = identity.returnPath;
    const session = await provisionWebsiteSession(
      identity,
      websiteIdentityClient()
    );
    ctx.cookies.set("exdocs_access", issueExternalSessionToken(session), {
      path: "/docs",
      httpOnly: true,
      sameSite: "lax",
      secure: new URL(env.URL).protocol === "https:",
      expires: session.expiresAt,
    });
    ctx.redirect(returnPath);
  } catch (error) {
    if (error instanceof WebsiteOidcFlowError) {
      returnPath = error.returnPath;
    }
    ctx.redirect(`${safeReturnPath(returnPath)}#website-signin-unavailable`);
  }
});

router.get(
  "/redirect",
  authMiddleware({ type: AuthenticationType.APP }),
  async (ctx: APIContext) => {
    if (env.WEBSITE_INTEGRATION_ENABLED) {
      ctx.status = 404;
      return;
    }
    const { user, service } = ctx.state.auth;

    const payload = getJWTPayload(ctx.state.auth.token);
    if (payload.type !== "transfer") {
      throw AuthenticationError("Cannot extend token");
    }

    const expires = addMonths(new Date(), 3);
    const jwtToken = user.getSessionToken(expires, service);

    // ensure that the lastActiveAt on user is updated to prevent replay requests
    await user.updateActiveAt(ctx, true);

    ctx.cookies.set("accessToken", jwtToken, {
      sameSite: "lax",
      expires,
    });
    const [team, collection, view] = await Promise.all([
      Team.findByPk(user.teamId),
      Collection.findFirstCollectionForUser(user),
      View.findOne({
        where: {
          userId: user.id,
        },
      }),
    ]);

    const defaultCollectionId = team?.defaultCollectionId;

    if (defaultCollectionId) {
      const collection = await Collection.findOne({
        where: {
          id: defaultCollectionId,
          teamId: team.id,
        },
      });

      if (collection) {
        ctx.redirect(`${team.url}${collection.path}`);
        return;
      }
    }

    const hasViewedDocuments = !!view;

    ctx.redirect(
      !hasViewedDocuments && collection
        ? `${team?.url}${collection.path}/recent`
        : `${team?.url}/home`
    );
  }
);

app.use(bodyParser());
app.use(coalesceBody());
app.use(verifyCSRFToken());
app.use(router.routes());

export default app;
