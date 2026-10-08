import { useTranslation } from "react-i18next";
import { DocsStatus } from "~/components/DocsStatus";

/** Renders the shared loading state in the available full-height surface. */
export default function FullscreenLoading() {
  const { t } = useTranslation();
  return (
    <DocsStatus
      state="loading"
      layout="fullscreen"
      title={t("Loading")}
      content={t("Loading")}
    />
  );
}
