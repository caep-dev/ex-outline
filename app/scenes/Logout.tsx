import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Redirect } from "react-router-dom";
import Button from "~/components/Button";
import env from "~/env";
import useStores from "~/hooks/useStores";
import { logoutPath } from "~/utils/routeHelpers";

const Logout = () => {
  const { auth } = useStores();
  const { t } = useTranslation();
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
      <main>
        {failed ? (
          <>
            <p role="alert">{t("Unable to sign out. Try again.")}</p>
            <Button
              onClick={() => {
                setFailed(false);
                void auth
                  .logout({ userInitiated: true, clearCache: true })
                  .catch(() => setFailed(true));
              }}
            >
              {t("Retry")}
            </Button>
          </>
        ) : (
          <p role="status">{t("Signing out…")}</p>
        )}
      </main>
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
