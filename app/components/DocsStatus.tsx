import { Files, LoaderCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import styled, { keyframes } from "styled-components";
import { WarningIcon } from "@shared/components/LucideIcon";
import { s } from "@shared/styles";
import { websitePublicTranslation } from "~/utils/websitePublicTranslation";
import Button from "~/components/Button";

interface DocsStatusProps {
  state: "loading" | "error" | "empty" | "unavailable";
  title: string;
  content: string;
  onRetry?: () => void;
  focusTarget?: boolean;
}

/**
 * Renders a localized, accessible document loading, empty, or failure state.
 *
 * @param props state, safe message, and optional retry callback.
 * @returns an icon, title, content, and action.
 */
export function DocsStatus({
  state,
  title,
  content,
  onRetry,
  focusTarget = true,
}: DocsStatusProps) {
  const { t, i18n } = useTranslation();
  const isError = state === "error" || state === "unavailable";
  return (
    <Panel
      role={isError ? "alert" : "status"}
      tabIndex={-1}
      data-docs-focus={focusTarget ? "true" : "false"}
      data-docs-state={state}
      aria-busy={state === "loading" ? true : undefined}
    >
      {state === "loading" ? (
        <Spinner aria-hidden />
      ) : isError ? (
        <WarningIcon aria-hidden />
      ) : (
        <EmptyHero aria-hidden size={64} strokeWidth={1.25} />
      )}
      <h2>{title}</h2>
      <p>{content}</p>
      {isError && onRetry && (
        <Button type="button" onClick={onRetry}>
          {t("Retry", websitePublicTranslation(i18n.language, "Retry", "重试"))}
        </Button>
      )}
    </Panel>
  );
}

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const Panel = styled.section`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 3rem 1.5rem;
  color: ${s("text")};
  h2 {
    margin: 1rem 0 0;
  }
  p {
    color: ${s("textSecondary")};
  }

  &[data-docs-state="empty"] {
    min-height: 330px;
    justify-content: center;

    h2 {
      margin: 24px 0 0;
      font-size: 20px;
      line-height: 1.45;
      font-weight: 600;
      letter-spacing: -0.3px;
    }

    p {
      max-width: 350px;
      margin: 8px 0 0;
      font-size: 14px;
      line-height: 1.8;
      text-wrap: balance;
    }
  }
`;

const EmptyHero = styled(Files)`
  flex-shrink: 0;
  color: ${s("textTertiary")};
`;

const Spinner = styled(LoaderCircle)`
  animation: ${spin} 1s linear infinite;
  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;
