import { useTranslation } from "react-i18next";
import { DocsStatus, type DocsStatusLayout } from "~/components/DocsStatus";
import type { PublicResource } from "~/stores/PublicDocsStore";
import { websitePublicTranslation } from "~/utils/websitePublicTranslation";

/** Maps read failures to safe, localized shared status presentation. */
export function PublicFeedback({
  state,
  reason,
  retry,
  layout = "inline",
}: {
  state: PublicResource<never>["status"];
  retry?: () => void;
  reason?: PublicResource<never>["reason"];
  layout?: DocsStatusLayout;
}) {
  const { t, i18n } = useTranslation();
  const loading = state === "idle" || state === "loading";
  const unavailable = state === "unavailable";
  const reasons = {
    pagination: [
      "Pagination could not complete. Retry to reload from the first page.",
      "分页加载未能完成，请重试以从第一页重新加载。",
    ],
    network: [
      "The network connection is unavailable. Please retry.",
      "网络连接暂时不可用，请重试。",
    ],
    service: [
      "The document service is unavailable. Please retry.",
      "文档服务暂时不可用，请重试。",
    ],
    request: [
      "The request could not complete. Please retry.",
      "请求未能完成，请重试。",
    ],
  };
  const detail = reasons[reason ?? "request"];
  const failure =
    t(
      "Documents are temporarily unavailable.",
      websitePublicTranslation(
        i18n.language,
        "Documents are temporarily unavailable.",
        "文档暂时不可用。"
      )
    ) +
    " " +
    t(detail[0], websitePublicTranslation(i18n.language, detail[0], detail[1]));
  return (
    <DocsStatus
      state={loading ? "loading" : unavailable ? "not-found" : "error"}
      layout={layout}
      title={t(loading ? "Loading" : unavailable ? "Not found" : "Error")}
      content={
        loading
          ? t("Loading")
          : unavailable
            ? t(
                "The page you’re looking for cannot be found. It might have been deleted or the link is incorrect.",
                websitePublicTranslation(
                  i18n.language,
                  "The page you’re looking for cannot be found. It might have been deleted or the link is incorrect.",
                  "你访问的页面无法找到。它可能已被删除，或链接有误。"
                )
              )
            : failure
      }
      onRetry={retry}
      homeTo={unavailable && layout !== "inline" ? "/" : undefined}
    />
  );
}
