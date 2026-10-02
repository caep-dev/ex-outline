import { languages, resolveLanguage } from ".";
import { locales } from "../utils/date";

describe("supported interface languages", () => {
  it("offers only Simplified Chinese and English with matching date locales", () => {
    expect(languages).toEqual(["zh_CN", "en_US"]);
    expect(Object.keys(locales).sort()).toEqual([...languages].sort());
  });

  it.each(["zh_CN", "zh-CN", "zh_TW", "zh-HK", "zh", "ZH-cn"])(
    "resolves %s to Simplified Chinese",
    (language) => {
      expect(resolveLanguage(language)).toBe("zh_CN");
    }
  );

  it.each(["en_US", "en-GB", "en", "de_DE", "he-IL", "", null, undefined])(
    "resolves %s to English",
    (language) => {
      expect(resolveLanguage(language)).toBe("en_US");
    }
  );
});
