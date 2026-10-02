import i18n from "i18next";
import en_US from "../../shared/i18n/locales/en_US/translation.json";
import zh_CN from "../../shared/i18n/locales/zh_CN/translation.json";
import { resolveLanguage } from "@shared/i18n";
import { unicodeCLDRtoBCP47 } from "@shared/utils/date";

// i18n is already initialized globally via app/test/setup.ts.
beforeAll(() => {
  i18n
    .addResources("en-US", "translation", en_US)
    .addResources("zh-CN", "translation", zh_CN);
});

describe("supported interface translations", () => {
  it.each(["en-US", "zh-CN"])(
    "switches from %s to both supported languages",
    async (initialLanguage) => {
      await i18n.changeLanguage(initialLanguage);
      await i18n.changeLanguage("en-US");
      expect(i18n.t("Saving")).toBe("Saving");
      await i18n.changeLanguage("zh-CN");
      expect(i18n.t("Saving")).toBe("保存中");
    }
  );

  it.each(["de_DE", "pt_PT", "he_IL"])(
    "loads English for the removed %s preference",
    async (language) => {
      await i18n.changeLanguage(unicodeCLDRtoBCP47(resolveLanguage(language)));
      expect(i18n.t("Saving")).toBe("Saving");
    }
  );

  it("loads Simplified Chinese for a Traditional Chinese preference", async () => {
    await i18n.changeLanguage(unicodeCLDRtoBCP47(resolveLanguage("zh_TW")));
    expect(i18n.t("Saving")).toBe("保存中");
  });
});
