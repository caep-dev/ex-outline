import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Redirect } from "react-router-dom";
import { DocsRecoveryLayout } from "~/components/DocsRecoveryLayout";
import { DocsStatus } from "~/components/DocsStatus";
import env from "~/env";
import useStores from "~/hooks/useStores";
import { websitePublicTranslation } from "~/utils/websitePublicTranslation";
import { logoutPath } from "~/utils/routeHelpers";

const Logout = () => {
  const { auth } = useStores();
  const { t, i18n } = useTranslation();
  const started = useRef(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!auth.websiteIntegrationEnabled || started.current) {
      return;
    }
    started.current = true;
    void auth
      .logout({ userInitiated: true, clearCache: true })
      .catch(() => setFailed(true));
  }, [auth]);

  if (auth.websiteIntegrationEnabled) {
    return (
      <DocsRecoveryLayout>
        {failed ? (
          <>
            <DocsStatus
              state="error"
              title={t(
                "Sign out",
                websitePublicTranslation(i18n.language, "Sign out", "退出登录")
              )}
              content={t(
                "Unable to sign out. Try again.",
                websitePublicTranslation(
                  i18n.language,
                  "Unable to sign out. Try again.",
                  "\u65e0\u6cd5\u9000\u51fa\u767b\u5f55\uff0c\u8bf7\u91cd\u8bd5\u3002"
                )
              )}
              onRetry={() => {
                setFailed(false);
                void auth
                  .logout({ userInitiated: true, clearCache: true })
                  .catch(() => setFailed(true));
              }}
            />
          </>
        ) : (
          <DocsStatus
            state="loading"
            title={t("Signing out…")}
            content={t(
              "Please wait while your session is signed out.",
              websitePublicTranslation(
                i18n.language,
                "Please wait while your session is signed out.",
                "正在退出当前会话，请稍候。"
              )
            )}
          />
        )}
      </DocsRecoveryLayout>
    );
  }

  void auth.logout({
    userInitiated: true,
    clearCache: true,
  });

  if (env.OIDC_LOGOUT_URI || auth.lastSignedIn === "oidc") {
    return null; // user will be redirected to logout URI after logout
  }
  return <Redirect to={logoutPath()} />;
};

export default Logout;
