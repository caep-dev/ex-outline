import type { Context } from "koa";
import JWT from "jsonwebtoken";
import env from "@server/env";
import { ExternalIdentity, ExternalSession, User } from "@server/models";
import SessionGuard, { SessionGuardError } from "./SessionGuard";
import WebsiteIdentityClient from "./WebsiteIdentityClient";
import { websiteIntegrationConfig } from "./config";
import { syncWebsiteProfile } from "./syncWebsiteProfile";

let guard: SessionGuard | undefined;
let client: WebsiteIdentityClient | undefined;

export function websiteIdentityClient(): WebsiteIdentityClient {
  if (!client) {
    client = new WebsiteIdentityClient(
      websiteIntegrationConfig().websiteInternalUrl,
      process.env.OUTLINE_INTEGRATION_KEY ?? ""
    );
  }
  return client;
}

export function websiteSessionGuard(): SessionGuard {
  if (!guard) {
    guard = new SessionGuard({
      check: (sid, subject) => websiteIdentityClient().check(sid, subject),
    });
  }
  return guard;
}

type TokenPayload = JWT.JwtPayload & {
  type: "website-session" | "website-collaboration";
  externalSessionId: string;
  userId: string;
};

export function issueExternalSessionToken(session: ExternalSession): string {
  const seconds = Math.floor((session.expiresAt.getTime() - Date.now()) / 1000);
  if (seconds <= 0 || session.revokedAt) {
    throw new SessionGuardError(401);
  }
  return JWT.sign(
    {
      type: "website-session",
      externalSessionId: session.id,
      userId: session.userId,
    },
    Buffer.from(env.SECRET_KEY, "hex"),
    { algorithm: "HS256", expiresIn: seconds }
  );
}

export function issueCollaborationToken(session: ExternalSession): string {
  if (session.revokedAt || session.expiresAt.getTime() <= Date.now()) {
    throw new SessionGuardError(401);
  }
  return JWT.sign(
    {
      type: "website-collaboration",
      externalSessionId: session.id,
      userId: session.userId,
    },
    Buffer.from(env.SECRET_KEY, "hex"),
    { algorithm: "HS256", expiresIn: 60 }
  );
}

export async function authenticateExternalToken(
  token: string,
  type: TokenPayload["type"]
): Promise<{
  user: User;
  session: ExternalSession;
  websiteSubject: string;
}> {
  let payload: TokenPayload;
  try {
    const verified = JWT.verify(token, Buffer.from(env.SECRET_KEY, "hex"), {
      algorithms: ["HS256"],
    });
    if (
      typeof verified === "string" ||
      verified.type !== type ||
      typeof verified.externalSessionId !== "string" ||
      typeof verified.userId !== "string"
    ) {
      throw new Error("Invalid integrated token");
    }
    payload = verified as TokenPayload;
  } catch {
    throw new SessionGuardError(401);
  }

  const session = await ExternalSession.findByPk(payload.externalSessionId);
  if (
    !session ||
    session.userId !== payload.userId ||
    session.clientId !== websiteIntegrationConfig().clientId
  ) {
    throw new SessionGuardError(401);
  }
  const [user, identity] = await Promise.all([
    User.scope("withTeam").findByPk(session.userId),
    ExternalIdentity.findOne({ where: { userId: session.userId } }),
  ]);
  if (
    !user ||
    !identity ||
    identity.issuer !== websiteIntegrationConfig().issuer
  ) {
    throw new SessionGuardError(401);
  }
  const linked = await websiteSessionGuard().assertCurrent({
    ...session.get(),
    websiteSubject: identity.subject,
  });
  await syncWebsiteProfile(identity, user, linked.profile);
  return { user, session, websiteSubject: identity.subject };
}

export async function authenticateExternalSession(ctx: Context): Promise<{
  user: User;
  session: ExternalSession;
  websiteSubject: string;
} | null> {
  const token = ctx.cookies.get("exdocs_access");
  if (!token) {
    return null;
  }
  return authenticateExternalToken(token, "website-session");
}
