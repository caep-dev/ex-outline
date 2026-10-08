import type { Location } from "history";
import { useTranslation } from "react-i18next";
import { DocsStatus } from "~/components/DocsStatus";
import Scene from "~/components/Scene";

type Props = {
  location: Location<{ title?: string }>;
};

export default function Loading({ location }: Props) {
  const { t } = useTranslation();
  return (
    <Scene title={location.state?.title ?? t("Loading")} centered={false}>
      <DocsStatus
        state="loading"
        layout="page"
        title={t("Loading")}
        content={t("Loading")}
      />
    </Scene>
  );
}
