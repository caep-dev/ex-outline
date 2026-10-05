import { subHours, subMinutes } from "date-fns";
import Router from "koa-router";
import { uniqBy } from "es-toolkit/compat";
import { TeamPreference } from "@shared/types";
import { parseDomain } from "@shared/utils/domains";
import env from "@server/env";
import auth from "@server/middlewares/authentication";
import { transaction } from "@server/middlewares/transaction";
import { Collection, Event, Team, WebsiteIntegration } from "@server/models";
import { can } from "@server/policies";
import AuthenticationHelper from "@server/models/helpers/AuthenticationHelper";
import {
  presentUser,
  presentTeam,
  presentPolicies,
  presentProviderConfig,
  presentAvailableTeam,
  presentGroup,
  presentGroupUser,
} from "@server/presenters";
import ValidateSSOAccessTask from "@server/queues/tasks/ValidateSSOAccessTask";
import type { APIContext } from "@server/types";
import { AuthenticationType } from "@server/types";
import { getSessionsInCookie } from "@server/utils/authentication";
import RateLimiter from "@server/utils/RateLimiter";
import {
  issueCollaborationToken,
  websiteIdentityClient,
} from "@server/identity/authenticateExternalSession";
import { SessionGuardError } from "@server/identity/SessionGuard";
import type * as T from "./schema";

const router = new Router();

router.post("auth.config", async (ctx: APIContext<T.AuthConfigReq>) => {
  const websiteIntegrationEnabled = env.WEBSITE_INTEGRATION_ENABLED;
  const initialized =
    !websiteIntegrationEnabled ||
    !!(await WebsiteIntegration.findByPk("website"));
  const integrationMode = { websiteIntegrationEnabled, initialized };
  if (websiteIntegrationEnabled && !initialized) {
    ctx.body = { data: { ...integrationMode, providers: [] } };
    return;
  }
  // If self hosted AND there is only one team then that team becomes the
  // brand for the knowledge base and it's guest signin option is used for the
  // root login page.
  if (!env.isCloudHosted) {
    const team = await Team.scope("withAuthenticationProviders").findOne({
      order: [["createdAt", "DESC"]],
    });

    if (team) {
      ctx.body = {
        data: {
          ...integrationMode,
          name: team.name,
          customTheme: team.getPreference(TeamPreference.CustomTheme),
          logo: team.getPreference(TeamPreference.PublicBranding)
            ? team.avatarUrl
            : undefined,
          providers: (await AuthenticationHelper.providersForTeam(team)).map(
            presentProviderConfig
          ),
        },
      };
      return;
    }
  }

  const domain = parseDomain(ctx.request.hostname);

  if (domain.custom) {
    const team = await Team.scope("withAuthenticationProviders").findOne({
      where: {
        domain: ctx.request.hostname.toLowerCase(),
      },
    });

    if (team) {
      ctx.body = {
        data: {
          ...integrationMode,
          name: team.name,
          customTheme: team.getPreference(TeamPreference.CustomTheme),
          logo: team.getPreference(TeamPreference.PublicBranding)
            ? team.avatarUrl
            : undefined,
          hostname: ctx.request.hostname,
          providers: (await AuthenticationHelper.providersForTeam(team)).map(
            presentProviderConfig
          ),
        },
      };
      return;
    }
  }

  // If subdomain signin page then we return minimal team details to allow
  // for a custom screen showing only relevant signin options for that team.
  else if (env.isCloudHosted && domain.teamSubdomain) {
    const team = await Team.scope("withAuthenticationProviders").findOne({
      where: {
        subdomain: domain.teamSubdomain,
      },
    });

    if (team) {
      ctx.body = {
        data: {
          ...integrationMode,
          name: team.name,
          customTheme: team.getPreference(TeamPreference.CustomTheme),
          logo: team.getPreference(TeamPreference.PublicBranding)
            ? team.avatarUrl
            : undefined,
          hostname: ctx.request.hostname,
          providers: (await AuthenticationHelper.providersForTeam(team)).map(
            presentProviderConfig
          ),
        },
      };
      return;
    }
  }

  // Otherwise, we're requesting from the standard root signin page
  ctx.body = {
    data: {
      ...integrationMode,
      providers: (await AuthenticationHelper.providersForTeam()).map(
        presentProviderConfig
      ),
    },
  };
});

/** Authentication services that don't require SSO validation. */
const NON_SSO_SERVICES = ["email", "passkeys"];

router.post("auth.info", auth(), async (ctx: APIContext<T.AuthInfoReq>) => {
  const { user, service, type } = ctx.state.auth;
  const sessions = getSessionsInCookie(ctx);
  const signedInTeamIds = Object.keys(sessions);

  const [team, groups, signedInTeams, availableTeams] = await Promise.all([
    Team.scope("withDomains").findByPk(user.teamId, {
      rejectOnEmpty: true,
    }),
    user.groups(),
    Team.findAll({
      where: {
        id: signedInTeamIds,
      },
    }),
    user.availableTeams(),
  ]);

  // If the user did not _just_ sign in then we need to check if they continue
  // to have access to the workspace they are signed into. This only applies
  // to SSO sessions - email and passkey logins don't have associated
  // UserAuthentication records that need validation.
  const requiresSSOValidation = !service || !NON_SSO_SERVICES.includes(service);
  if (
    requiresSSOValidation &&
    user.lastSignedInAt &&
    user.lastSignedInAt < subHours(new Date(), 1)
  ) {
    await new ValidateSSOAccessTask()
      .schedule(
        {
          userId: user.id,
        },
        {
          jobId: `validate-sso:${user.id}`,
        }
      )
      .catch(() => {
        // Ignore errors from duplicate jobId when a validation is already queued
      });
  }

  const policies = presentPolicies(user, [team, user, ...groups]);
  if (env.WEBSITE_INTEGRATION_ENABLED) {
    const collections = await Collection.scope({
      method: ["withMembership", user.id],
    }).findAll({ where: { teamId: team.id } });
    const teamPolicy = policies.find((policy) => policy.id === team.id);
    if (teamPolicy) {
      teamPolicy.abilities.createDocument = collections.some((collection) =>
        can(user, "createDocument", collection)
      );
    }
  }

  ctx.body = {
    data: {
      user: presentUser(user, {
        includeDetails: true,
      }),
      team: presentTeam(team),
      groups: await Promise.all(groups.map(presentGroup)),
      groupUsers: groups.map((group) => presentGroupUser(group.groupUsers[0])),
      // The collaboration token is only for the client and should not be issued
      // to API or OAuth consumers
      collaborationToken:
        type === AuthenticationType.APP
          ? env.WEBSITE_INTEGRATION_ENABLED && ctx.state.externalSession
            ? issueCollaborationToken(ctx.state.externalSession)
            : user.getCollaborationToken()
          : undefined,
      availableTeams: uniqBy([...signedInTeams, ...availableTeams], "id").map(
        (availableTeam) =>
          presentAvailableTeam(
            availableTeam,
            signedInTeamIds.includes(team.id) ||
              availableTeam.id === user.teamId
          )
      ),
    },
    policies,
  };
});

router.post(
  "auth.delete",
  auth(),
  transaction(),
  async (ctx: APIContext<T.AuthDeleteReq>) => {
    const { auth, transaction } = ctx.state;
    const { user, token } = auth;

    if (env.WEBSITE_INTEGRATION_ENABLED) {
      const session = ctx.state.externalSession;
      const subject = ctx.state.websiteSubject;
      if (!session || !subject) {
        throw new SessionGuardError(401);
      }
      await websiteIdentityClient().revoke(session.hydraSid, subject);
      await session.update({ revokedAt: new Date() }, { transaction });
      ctx.cookies.set("exdocs_access", "", {
        path: "/docs",
        httpOnly: true,
        sameSite: "lax",
        expires: new Date(0),
      });
      ctx.body = { success: true, redirectUrl: "/identity/signed-out" };
      return;
    }

    await user.rotateJwtSecret({ transaction });
    await Event.createFromContext(ctx, {
      name: "users.signout",
      userId: user.id,
      data: {
        name: user.name,
      },
    });

    void RateLimiter.clearCachedToken(token);

    ctx.cookies.set("accessToken", "", {
      sameSite: "lax",
      expires: subMinutes(new Date(), 1),
    });

    ctx.body = {
      success: true,
    };
  }
);

export default router;
