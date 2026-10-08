import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { DocsLayout } from "~/components/DocsLayout";
import Header from "~/components/Header";
import Flex from "~/components/Flex";
import { PublicNavigation } from "~/scenes/WebsitePublic/PublicNavigation";

/** Keeps integrated recovery and logout in one identity-free document shell. */
export function DocsRecoveryLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  return (
    <DocsLayout title={t("Documents")} sidebar={<PublicNavigation recovery />}>
      <RecoveryContent column auto>
        <Header hasSidebar title={t("Documents")} />
        {children}
      </RecoveryContent>
    </DocsLayout>
  );
}

const RecoveryContent = styled(Flex)`
  > button {
    align-self: center;
  }
`;
