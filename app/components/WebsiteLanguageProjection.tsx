import { observer } from "mobx-react";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import env from "~/env";
import useStores from "~/hooks/useStores";
import { changeLanguage } from "~/utils/language";
import { isWebsiteIntegration } from "~/utils/websiteIntegration";
import Logger from "~/utils/Logger";

/** Projects only a verified account language, serializing async resource loads. */
export const WebsiteLanguageProjection = observer(
  function WebsiteLanguageProjection() {
    const { auth } = useStores();
    const { i18n } = useTranslation();
    const generation = useRef(0);
    const pending = useRef(Promise.resolve());
    const locale =
      auth.authenticated && auth.user?.id === auth.verifiedLanguageUserId
        ? auth.user?.language || env.DEFAULT_LANGUAGE
        : env.DEFAULT_LANGUAGE;
    useEffect(() => {
      if (!isWebsiteIntegration()) {
        return undefined;
      }
      const current = ++generation.current;
      pending.current = pending.current
        .then(async () => {
          if (current === generation.current) {
            await changeLanguage(locale, i18n);
          }
        })
        .catch((error) =>
          Logger.error("Failed to project Website language", error)
        );
      return () => {
        generation.current += 1;
      };
    }, [locale, i18n]);
    return null;
  }
);
