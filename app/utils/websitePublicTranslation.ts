import { resolveLanguage } from "@shared/i18n";

/** Keeps missing Chinese keys from falling through to an English catalog. */
export function websitePublicTranslation(
  language: string,
  english: string,
  chinese: string
) {
  return {
    defaultValue: resolveLanguage(language) === "zh_CN" ? chinese : english,
    fallbackLng: [],
  };
}
