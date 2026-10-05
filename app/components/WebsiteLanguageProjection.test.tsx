import i18n from "i18next";
import { observable, runInAction } from "mobx";
import { act, cleanup, render, waitFor } from "@testing-library/react";
import en from "../../shared/i18n/locales/en_US/translation.json";
import zh from "../../shared/i18n/locales/zh_CN/translation.json";
import { WebsiteLanguageProjection } from "./WebsiteLanguageProjection";
import { websitePublicTranslation } from "~/utils/websitePublicTranslation";
import { changeLanguage } from "~/utils/language";

const authState = vi.hoisted(() => ({
  authenticated: false,
  user: { id: "u1", language: "en_US" },
  verifiedLanguageUserId: undefined as string | undefined,
}));
vi.mock("~/env", () => ({
  default: { WEBSITE_INTEGRATION_ENABLED: true, DEFAULT_LANGUAGE: "zh_CN" },
}));
const auth = observable(authState);
vi.mock("~/hooks/useStores", () => ({ default: () => ({ auth }) }));

beforeEach(async () => {
  i18n
    .addResources("en-US", "translation", en)
    .addResources("zh-CN", "translation", zh);
  authState.authenticated = false;
  authState.verifiedLanguageUserId = undefined;
  authState.user.language = "en_US";
  Object.assign(auth, authState);
  vi.restoreAllMocks();
  await changeLanguage("en_US", i18n);
});
afterEach(() => cleanup());

it("uses Chinese for anonymous/cached accounts, preserves verified English and resets on logout", async () => {
  const view = render(<WebsiteLanguageProjection />);
  await waitFor(() => expect(document.documentElement.lang).toBe("zh-CN"));
  authState.authenticated = true;
  runInAction(() => {
    Object.assign(auth, authState);
  });
  view.rerender(<WebsiteLanguageProjection />);
  expect(i18n.language).toBe("zh-CN");
  authState.verifiedLanguageUserId = "u1";
  runInAction(() => {
    Object.assign(auth, authState);
  });
  view.rerender(<WebsiteLanguageProjection />);
  await waitFor(() => expect(i18n.language).toBe("en-US"));
  authState.user.language = "zh_CN";
  runInAction(() => {
    Object.assign(auth, authState);
  });
  view.rerender(<WebsiteLanguageProjection />);
  await waitFor(() => expect(i18n.language).toBe("zh-CN"));
  authState.user.language = "en_US";
  runInAction(() => {
    Object.assign(auth, authState);
  });
  view.rerender(<WebsiteLanguageProjection />);
  await waitFor(() => expect(i18n.language).toBe("en-US"));
  authState.authenticated = false;
  runInAction(() => {
    Object.assign(auth, authState);
  });
  view.rerender(<WebsiteLanguageProjection />);
  await waitFor(() => expect(document.documentElement.lang).toBe("zh-CN"));
  expect(document.documentElement.dir).toBe("ltr");
});

it("converges to anonymous Chinese when an old English load completes late", async () => {
  const view = render(<WebsiteLanguageProjection />);
  await waitFor(() => expect(i18n.language).toBe("zh-CN"));
  let release: () => void = () => {};
  const original = i18n.changeLanguage.bind(i18n);
  const spy = vi
    .spyOn(i18n, "changeLanguage")
    .mockImplementationOnce(async (language) => {
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      return original(language);
    });
  authState.authenticated = true;
  authState.verifiedLanguageUserId = "u1";
  runInAction(() => {
    Object.assign(auth, authState);
  });
  view.rerender(<WebsiteLanguageProjection />);
  await waitFor(() => expect(spy).toHaveBeenCalled());
  authState.authenticated = false;
  runInAction(() => {
    Object.assign(auth, authState);
  });
  view.rerender(<WebsiteLanguageProjection />);
  await act(async () => {
    release();
  });
  await waitFor(() => expect(i18n.language).toBe("zh-CN"));
  expect(document.documentElement.lang).toBe("zh-CN");
  spy.mockRestore();
});

it("uses a Chinese default even when English fallback has the new key", async () => {
  const key =
    "Sign-in status is unavailable. Public documents remain available.";
  i18n.addResource("en-US", "translation", key, key);
  await i18n.changeLanguage("zh-CN");
  expect(
    i18n.t(
      key,
      websitePublicTranslation(
        i18n.language,
        key,
        "登录暂不可用，公开文档仍可阅读。"
      )
    )
  ).toBe("登录暂不可用，公开文档仍可阅读。");
  await i18n.changeLanguage("en-US");
  expect(
    i18n.t(
      key,
      websitePublicTranslation(
        i18n.language,
        key,
        "登录暂不可用，公开文档仍可阅读。"
      )
    )
  ).toBe(key);
});
