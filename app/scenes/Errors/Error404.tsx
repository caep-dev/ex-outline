import { useTranslation } from "react-i18next";
import { DocsStatus } from "~/components/DocsStatus";
import Scene from "~/components/Scene";
import { websitePublicTranslation } from "~/utils/websitePublicTranslation";

const Error404 = () => {
  const { t, i18n } = useTranslation();

  return (
    <Scene title={t("Not found")} centered={false}>
      <DocsStatus
        state="not-found"
        layout="page"
        title={t("Not found")}
        content={t(
          "The page you’re looking for cannot be found. It might have been deleted or the link is incorrect.",
          websitePublicTranslation(
            i18n.language,
            "The page you’re looking for cannot be found. It might have been deleted or the link is incorrect.",
            "你访问的页面无法找到。它可能已被删除，或链接有误。"
          )
        )}
        homeTo="/"
      />
    </Scene>
  );
};

export default Error404;
