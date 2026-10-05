import { createHash, timingSafeEqual } from "node:crypto";
import { docsReturnPath } from "@shared/utils/docsReturnPath";
import * as oidc from "openid-client";
import RedisAdapter from "@server/storage/redis";
import Logger from "@server/logging/Logger";

import { websiteIntegrationConfig } from "./config";

interface FlowState {
  nonce: string;
  verifier: string;
  returnPath: string;
  browserBindingHash: string;
}

/** Carries only a validated public return path after an OIDC failure. */
export class WebsiteOidcFlowError extends Error {
  constructor(public readonly returnPath: string) {
    super("Website sign-in could not be completed");
  }
}

export type VerifiedWebsiteIdentity = {
  subject: string;
  sid: string;
  websiteSessionId: string;
  nickname: string;
  email: string;
  picture: string | null;
  profileVersion: number;
  expiresAt: Date;
  accessToken: string;
  returnPath: string;
};

/** Keep return navigation within the public docs mount. */
export function safeReturnPath(value: unknown): string {
  return docsReturnPath(value, websiteIntegrationConfig().websiteOrigin);
}

let configuration: Promise<oidc.Configuration> | undefined;

async function getConfiguration(): Promise<oidc.Configuration> {
  const { issuer, clientId, redirectUri } = websiteIntegrationConfig();
  if (
    process.env.HYDRA_PUBLIC_URL !== issuer ||
    process.env.OUTLINE_OIDC_CLIENT_ID !== clientId ||
    !process.env.OUTLINE_OIDC_CLIENT_SECRET
  ) {
    throw new Error("Website OIDC is not configured");
  }
  if (!configuration) {
    configuration = oidc
      .discovery(
        new URL(issuer),
        clientId,
        {
          client_secret: process.env.OUTLINE_OIDC_CLIENT_SECRET,
          token_endpoint_auth_method: "client_secret_basic",
          redirect_uris: [redirectUri],
        },
        oidc.ClientSecretBasic(process.env.OUTLINE_OIDC_CLIENT_SECRET),
        {
          execute: [
            oidc.allowInsecureRequests,
            oidc.enableNonRepudiationChecks,
          ],
          timeout: 1,
        }
      )
      .catch((error) => {
        configuration = undefined;
        throw error;
      });
  }
  return configuration;
}

/** Creates an expiring OIDC flow bound to the initiating browser proof. */
export async function beginWebsiteOidc(
  returnTo: unknown,
  browserBinding: string
): Promise<URL> {
  const { clientId, redirectUri } = websiteIntegrationConfig();
  const statePrefix = `website-oidc-state:${clientId}:`;
  const config = await getConfiguration();
  const state = oidc.randomState();
  const nonce = oidc.randomNonce();
  const verifier = oidc.randomPKCECodeVerifier();
  const challenge = await oidc.calculatePKCECodeChallenge(verifier);
  const flow: FlowState = {
    nonce,
    verifier,
    returnPath: safeReturnPath(returnTo),
    browserBindingHash: bindingHash(browserBinding),
  };
  const stored = await RedisAdapter.defaultClient.set(
    `${statePrefix}${state}`,
    JSON.stringify(flow),
    "EX",
    600,
    "NX"
  );
  if (stored !== "OK") {
    throw new Error("Could not create OIDC state");
  }
  return oidc.buildAuthorizationUrl(config, {
    response_type: "code",
    redirect_uri: redirectUri,
    scope: "openid profile email",
    state,
    nonce,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });
}

/** Verifies the browser proof before consuming state and validating the code grant. */
export async function completeWebsiteOidc(
  query: string,
  browserBinding: string | undefined
): Promise<VerifiedWebsiteIdentity> {
  const { clientId, redirectUri } = websiteIntegrationConfig();
  const statePrefix = `website-oidc-state:${clientId}:`;
  let stage = "state";
  let returnPath = "/docs/";
  try {
    const callback = new URL(redirectUri);
    callback.search = query;
    const state = callback.searchParams.get("state");
    if (!state || !/^[A-Za-z0-9_-]{22,128}$/.test(state)) {
      throw new Error("OIDC state is invalid");
    }
    const stored = await RedisAdapter.defaultClient.get(
      `${statePrefix}${state}`
    );
    if (!stored) {
      throw new Error("OIDC state expired or replayed");
    }
    let flow: FlowState;
    try {
      flow = JSON.parse(stored) as FlowState;
      if (
        !flow.nonce ||
        !flow.verifier ||
        typeof flow.returnPath !== "string" ||
        typeof flow.browserBindingHash !== "string" ||
        !/^[0-9a-f]{64}$/.test(flow.browserBindingHash)
      ) {
        throw new Error();
      }
    } catch {
      throw new Error("OIDC state is invalid");
    }
    stage = "browser";
    if (
      !browserBinding ||
      !/^[A-Za-z0-9_-]{43}$/.test(browserBinding) ||
      !timingSafeEqual(
        Buffer.from(bindingHash(browserBinding), "hex"),
        Buffer.from(flow.browserBindingHash, "hex")
      )
    ) {
      throw new Error("OIDC browser binding mismatch");
    }
    // Only the initiating browser can consume this state or obtain its return path.
    returnPath = safeReturnPath(flow.returnPath);
    if (
      (await RedisAdapter.defaultClient.getdel(`${statePrefix}${state}`)) !==
      stored
    ) {
      throw new Error("OIDC state expired or replayed");
    }
    stage = "discovery";
    const config = await getConfiguration();
    stage = "grant";
    const tokens = await oidc.authorizationCodeGrant(config, callback, {
      expectedState: state,
      expectedNonce: flow.nonce,
      pkceCodeVerifier: flow.verifier,
    });
    stage = "claims";
    const claims = tokens.claims();
    if (
      !claims ||
      typeof claims.sub !== "string" ||
      typeof claims.sid !== "string" ||
      typeof claims.ex_session_id !== "string" ||
      typeof tokens.access_token !== "string"
    ) {
      throw new Error("OIDC identity claims are incomplete");
    }
    stage = "userinfo";
    const userInfo = await oidc.fetchUserInfo(
      config,
      tokens.access_token,
      claims.sub
    );
    if (userInfo.sub !== claims.sub) {
      throw new Error("OIDC subject mismatch");
    }
    stage = "profile";
    const profileVersion = claims.profile_version;
    if (
      typeof profileVersion !== "number" ||
      !Number.isSafeInteger(profileVersion) ||
      profileVersion < 0
    ) {
      throw new Error("OIDC profile version is invalid");
    }
    const nickname =
      typeof userInfo.nickname === "string"
        ? userInfo.nickname
        : claims.nickname;
    const email =
      typeof userInfo.email === "string" ? userInfo.email : claims.email;
    if (
      typeof nickname !== "string" ||
      !nickname ||
      typeof email !== "string" ||
      !email
    ) {
      throw new Error("OIDC profile is incomplete");
    }
    const picture =
      typeof userInfo.picture === "string"
        ? userInfo.picture
        : typeof claims.picture === "string"
          ? claims.picture
          : null;
    return {
      subject: claims.sub,
      sid: claims.sid,
      websiteSessionId: claims.ex_session_id,
      nickname,
      email,
      picture,
      profileVersion,
      expiresAt: new Date(
        Date.now() + Math.min(tokens.expiresIn() ?? 0, 60) * 1000
      ),
      accessToken: tokens.access_token,
      returnPath: safeReturnPath(flow.returnPath),
    };
  } catch (error) {
    Logger.warn("Website OIDC callback rejected", {
      stage,
      errorType: error instanceof Error ? error.name : typeof error,
      status:
        error !== null &&
        typeof error === "object" &&
        "status" in error &&
        typeof error.status === "number"
          ? error.status
          : undefined,
    });
    throw new WebsiteOidcFlowError(returnPath);
  }
}

function bindingHash(binding: string): string {
  return createHash("sha256").update(binding).digest("hex");
}

/** Revokes the linked Website access token through the configured issuer. */
export async function revokeWebsiteAccessToken(token: string): Promise<void> {
  await oidc.tokenRevocation(await getConfiguration(), token, {
    token_type_hint: "access_token",
  });
}
