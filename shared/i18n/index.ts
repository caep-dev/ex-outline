import type { locales } from "../utils/date";

interface LanguageOption {
  label: string;
  value: keyof typeof locales;
}

// Keep the date locales in shared/utils/date.ts in sync with these options.
export const languageOptions: LanguageOption[] = [
  {
    label: "简体中文 (Chinese, Simplified)",
    value: "zh_CN",
  },
  {
    label: "English (US)",
    value: "en_US",
  },
];

export const languages = languageOptions.map((option) => option.value);

/**
 * Maps a browser locale or stored preference to a supported interface language.
 * Chinese variants use Simplified Chinese; other languages fall back to English.
 *
 * @param language the language in CLDR or BCP47 format.
 * @returns the supported language code in CLDR format.
 */
export function resolveLanguage(
  language: string | null | undefined
): keyof typeof locales {
  if (language?.split(/[-_]/)[0].toLowerCase() === "zh") {
    return "zh_CN";
  }
  return "en_US";
}
