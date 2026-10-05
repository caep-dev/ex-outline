import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { isWebsiteIntegration } from "~/utils/websiteIntegration";
import { changeLanguage } from "~/utils/language";

type Props = {
  locale: string;
};

export default function ChangeLanguage({ locale }: Props) {
  const { i18n } = useTranslation();

  useEffect(() => {
    if (!isWebsiteIntegration()) {
      void changeLanguage(locale, i18n);
    }
  }, [locale, i18n]);

  return null;
}
