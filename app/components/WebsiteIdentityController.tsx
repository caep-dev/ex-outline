import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { observer } from "mobx-react";
import { useHistory, useLocation } from "react-router-dom";
import {
  publicBasePath,
  publicPath,
  publicUrl,
} from "@shared/utils/publicPath";
import { parseDocsReturnPath } from "@shared/utils/docsReadingReturnPath";
import { DocsStatus } from "~/components/DocsStatus";
import { DocsRecoveryLayout } from "~/components/DocsRecoveryLayout";
import Button from "~/components/Button";
import { preflightDocsReading } from "~/utils/docsReadingPreflight";
import { NotFoundError } from "~/utils/errors";
import { useTranslation } from "react-i18next";
import { websitePublicTranslation } from "~/utils/websitePublicTranslation";
import { docsReturnPath } from "@shared/utils/docsReturnPath";
import { WebsiteSessionProbe } from "~/components/WebsiteSessionProbe";
import env from "~/env";
import useStores from "~/hooks/useStores";
import { setPostLoginPath } from "~/hooks/useLastVisitedPath";
import {
  claimWebsiteOidcAttempt,
  clearWebsiteOidcAttempt,
} from "~/utils/websiteOidcAttempt";
import { redirectTo } from "~/utils/urls";

interface WebsiteIdentity {
  unavailable: boolean;
  configStatus: "loading" | "ready" | "error";
  retry: () => void;
  signIn: () => void;
  finishReadingResume: (available: boolean) => void;
}
const IdentityContext = createContext<WebsiteIdentity>({
  unavailable: false,
  configStatus: "ready",
  retry: () => {},
  signIn: () => {},
  finishReadingResume: () => {},
});

/** Returns the one root-owned Website identity controller for public adapters. */
export function useWebsiteIdentity(): WebsiteIdentity {
  return useContext(IdentityContext);
}

/** Owns Website probing and OIDC attempts once across sidebar and reading routes. */
export const WebsiteIdentityController = observer(
  function WebsiteIdentityController({ children }: { children: ReactNode }) {
    const { auth, publicDocs } = useStores();
    const location = useLocation<{ docsReadingResume?: boolean }>();
    const history = useHistory();
    const { t, i18n } = useTranslation();
    const [resume, setResume] = useState<string | null>(() => {
      const hints = new URLSearchParams(location.search).getAll("docsResume");
      return hints.length
        ? parseDocsReturnPath(
            hints.length === 1 ? hints[0] : null,
            new URL(env.URL).origin
          ).path
        : null;
    });
    const [resumeStatus, setResumeStatus] = useState<
      "loading" | "error" | "unavailable"
    >("loading");
    const [readingUnavailable, setReadingUnavailable] = useState(false);
    const [resumeRetry, setResumeRetry] = useState(0);
    const bridgingBlocked =
      resume !== null ||
      readingUnavailable ||
      location.state?.docsReadingResume === true;
    const bridgingBlockedRef = useRef(bridgingBlocked);
    bridgingBlockedRef.current = bridgingBlocked;
    useLayoutEffect(() => {
      if (
        resume !== null &&
        new URLSearchParams(location.search).has("docsResume")
      ) {
        history.replace({ pathname: "/", search: "", hash: "" });
      }
    }, [resume, location.search, history]);
    useEffect(() => {
      if (resume === null) {
        return;
      }
      let active = true;
      setResumeStatus("loading");
      void preflightDocsReading(resume, new URL(env.URL).origin).then(
        (available) => {
          if (!active) {
            return;
          }
          if (!available) {
            publicDocs.invalidate();
            setResumeStatus("unavailable");
            return;
          }
          const target = new URL(resume, new URL(env.URL).origin);
          history.replace({
            pathname: target.pathname.slice("/docs".length) || "/",
            search: target.search,
            state: { docsReadingResume: true },
          });
          setResume(null);
        },
        (error: unknown) => {
          if (active) {
            if (error instanceof NotFoundError) {
              publicDocs.invalidate();
            }
            setResumeStatus(
              error instanceof NotFoundError ? "unavailable" : "error"
            );
          }
        }
      );
      return () => {
        active = false;
      };
    }, [resume, resumeRetry, history, auth.sessionGeneration, publicDocs]);
    const path = location.pathname + location.search;
    const origin = new URL(env.URL).origin;
    const returnPath = docsReturnPath(
      publicPath(publicBasePath(env.URL), path),
      origin
    );
    const signInFailed = location.hash === "#website-signin-unavailable";
    const [configStatus, setConfigStatus] = useState<
      WebsiteIdentity["configStatus"]
    >(auth.config ? "ready" : "loading");
    const [probeAttempt, setProbeAttempt] = useState(0);
    const currentProbeAttempt = useRef(probeAttempt);
    currentProbeAttempt.current = probeAttempt;
    const controllerGeneration = auth.sessionGeneration;
    const configAttempt = useRef(0);
    const identityAttempt = useRef(0);
    const [status, setStatus] = useState<{
      path: string;
      unavailable: boolean;
    }>({ path: returnPath, unavailable: false });
    const automaticAttempted = useRef<string | null>(null);
    const currentPath = useRef(returnPath);
    currentPath.current = returnPath;
    const signIn = (explicit = true) => {
      if (!claimWebsiteOidcAttempt(returnPath, origin, explicit) && !explicit) {
        return;
      }
      setPostLoginPath(path);
      const target = new URL(publicUrl(env.URL, "/auth/oidc"));
      target.searchParams.set("returnTo", returnPath);
      redirectTo(target.toString());
    };
    useEffect(() => {
      if (auth.authenticated) {
        clearWebsiteOidcAttempt();
      }
    }, [auth.authenticated]);
    const fetchConfig = () => {
      const attempt = ++configAttempt.current;
      const generation = auth.sessionGeneration;
      setConfigStatus("loading");
      void auth.fetchConfig().then(
        () => {
          if (
            attempt === configAttempt.current &&
            generation === auth.sessionGeneration
          ) {
            setConfigStatus("ready");
          }
        },
        () => {
          if (
            attempt === configAttempt.current &&
            generation === auth.sessionGeneration
          ) {
            setConfigStatus("error");
          }
        }
      );
    };
    useEffect(() => {
      if (!auth.config) {
        fetchConfig();
      } else {
        setConfigStatus("ready");
      }
      return () => {
        configAttempt.current += 1;
        identityAttempt.current += 1;
      };
      // Configuration is owned by this controller, not each adapter render.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [auth, auth.config, auth.sessionGeneration]);
    const retryIdentity = () => {
      if (configStatus === "error") {
        fetchConfig();
      } else if (signInFailed) {
        automaticAttempted.current = returnPath;
        history.replace({ ...location, hash: "" });
        signIn();
      } else if (auth.integrationAuthUnavailable) {
        const attempt = ++identityAttempt.current;
        const generation = auth.sessionGeneration;
        void auth.fetchAuth().catch(() => {
          if (
            attempt === identityAttempt.current &&
            generation === auth.sessionGeneration
          ) {
            setStatus({ path: currentPath.current, unavailable: true });
          }
        });
      } else {
        setStatus({ path: returnPath, unavailable: false });
        setProbeAttempt((attempt) => attempt + 1);
      }
    };
    return (
      <IdentityContext.Provider
        value={{
          unavailable:
            !auth.authenticated &&
            (signInFailed ||
              auth.integrationAuthUnavailable ||
              (status.path === returnPath && status.unavailable)),
          configStatus,
          retry: retryIdentity,
          signIn: () => signIn(),
          finishReadingResume: (available) => {
            if (available) {
              history.replace({
                pathname: location.pathname,
                search: location.search,
                hash: "",
                state:
                  location.pathname === "/"
                    ? { docsReadingDirectory: true }
                    : undefined,
              });
            } else {
              publicDocs.invalidate();
              setReadingUnavailable(true);
              history.replace({
                pathname: "/",
                search: "",
                hash: "",
                state: undefined,
              });
            }
          },
        }}
      >
        {!bridgingBlocked &&
        !auth.authenticated &&
        !auth.isFetching &&
        configStatus === "ready" &&
        auth.websiteIntegrationInitialized &&
        !auth.integrationAuthUnavailable ? (
          <WebsiteSessionProbe
            key={`${returnPath}:${probeAttempt}`}
            onStatus={(next) => {
              if (
                bridgingBlockedRef.current ||
                currentProbeAttempt.current !== probeAttempt ||
                auth.sessionGeneration !== controllerGeneration ||
                currentPath.current !== returnPath ||
                auth.authenticated
              ) {
                return;
              }
              setStatus({
                path: returnPath,
                unavailable: next === "unavailable",
              });
              if (
                next === "active" &&
                !signInFailed &&
                auth.websiteIntegrationInitialized &&
                automaticAttempted.current !== returnPath
              ) {
                automaticAttempted.current = returnPath;
                signIn(false);
              }
            }}
          />
        ) : null}
        {resume === null && !readingUnavailable ? (
          children
        ) : (
          <DocsRecoveryLayout>
            <DocsStatus
              state={readingUnavailable ? "unavailable" : resumeStatus}
              title={t("Documents")}
              content={
                !readingUnavailable && resumeStatus === "loading"
                  ? t("Loading")
                  : readingUnavailable || resumeStatus === "unavailable"
                    ? t(
                        "This document is unavailable.",
                        websitePublicTranslation(
                          i18n.language,
                          "This document is unavailable.",
                          "\u76ee\u6807\u5185\u5bb9\u5df2\u4e0d\u53ef\u7528\uff0c\u53ef\u8fd4\u56de\u516c\u5f00\u76ee\u5f55\u3002"
                        )
                      )
                    : t(
                        "Documents are unavailable. Try again.",
                        websitePublicTranslation(
                          i18n.language,
                          "Documents are unavailable. Try again.",
                          "\u6682\u65f6\u65e0\u6cd5\u52a0\u8f7d\u6587\u6863\uff0c\u8bf7\u91cd\u8bd5\u3002"
                        )
                      )
              }
              onRetry={
                !readingUnavailable && resumeStatus === "error"
                  ? () => setResumeRetry((count) => count + 1)
                  : undefined
              }
            />
            {(readingUnavailable || resumeStatus !== "loading") && (
              <Button
                type="button"
                onClick={() => {
                  history.replace({
                    pathname: "/",
                    state: { docsReadingDirectory: true },
                  });
                  setResume(null);
                  setReadingUnavailable(false);
                }}
              >
                {t(
                  "Back to documents",
                  websitePublicTranslation(
                    i18n.language,
                    "Back to documents",
                    "\u8fd4\u56de\u516c\u5f00\u6587\u6863"
                  )
                )}
              </Button>
            )}
          </DocsRecoveryLayout>
        )}
      </IdentityContext.Provider>
    );
  }
);
