import { Files, FileSearch, House, LoaderCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import styled, { keyframes } from "styled-components";
import { HEADER_HEIGHT } from "@shared/constants";
import { WarningIcon } from "@shared/components/LucideIcon";
import { s } from "@shared/styles";
import { websitePublicTranslation } from "~/utils/websitePublicTranslation";
import Button from "~/components/Button";

/** Controls whether a status fills the page or remains inside local content. */
export type DocsStatusLayout = "inline" | "page" | "fullscreen";

interface DocsStatusProps {
  state: "loading" | "error" | "empty" | "unavailable" | "not-found";
  title: string;
  content: string;
  onRetry?: () => void;
  focusTarget?: boolean;
  layout?: DocsStatusLayout;
  homeTo?: string;
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
  layout = "inline",
  homeTo,
}: DocsStatusProps) {
  const { t, i18n } = useTranslation();
  const isError = state === "error" || state === "unavailable";
  const isMissing = state === "not-found";
  return (
    <Panel
      role={isError || isMissing ? "alert" : "status"}
      $layout={layout}
      tabIndex={-1}
      data-docs-focus={focusTarget ? "true" : "false"}
      data-docs-state={state}
      aria-busy={state === "loading" ? true : undefined}
    >
      {state === "loading" ? (
        <Spinner aria-hidden size={26} strokeWidth={1.8} />
      ) : isMissing ? (
        <MissingHero aria-hidden size={52} strokeWidth={1.25} />
      ) : isError ? (
        <WarningIcon aria-hidden />
      ) : (
        <EmptyHero aria-hidden size={64} strokeWidth={1.25} />
      )}
      {state !== "loading" && <h2>{title}</h2>}
      <p>{content}</p>
      {isMissing && homeTo && (
        <StatusAction>
          <Button as={Link} to={homeTo} neutral icon={<House aria-hidden />}>
            {t(
              "Back to home",
              websitePublicTranslation(
                i18n.language,
                "Back to home",
                "返回主页"
              )
            )}
          </Button>
        </StatusAction>
      )}
      {isError && onRetry && (
        <StatusAction>
          <Button type="button" onClick={onRetry}>
            {t(
              "Retry",
              websitePublicTranslation(i18n.language, "Retry", "重试")
            )}
          </Button>
        </StatusAction>
      )}
    </Panel>
  );
}

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const Panel = styled.section<{ $layout: DocsStatusLayout }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 3rem 1.5rem;
  color: ${s("text")};
  box-sizing: border-box;
  /* Header buttons plus 12px padding on each side can exceed HEADER_HEIGHT. */
  ${(props) =>
    props.$layout !== "inline" &&
    `
    flex: 1;
    width: 100%;
    min-height: calc(100vh - ${props.$layout === "page" ? `max(${HEADER_HEIGHT}px, calc(${props.theme.exui.components.button.default.height} + 24px))` : "0px"});
    min-height: calc(100dvh - ${props.$layout === "page" ? `max(${HEADER_HEIGHT}px, calc(${props.theme.exui.components.button.default.height} + 24px))` : "0px"});
    justify-content: center;
  `}
  h2 {
    margin: 1rem 0 0;
  }
  p {
    color: ${s("textSecondary")};
  }

  &[data-docs-state="empty"],
  &[data-docs-state="not-found"] {
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

  &[data-docs-state="empty"] {
    min-height: 330px;
  }

  &[data-docs-state="loading"] {
    gap: 12px;

    p {
      margin: 0;
      font-size: 14px;
      line-height: 1.6;
    }
  }
`;

const StatusAction = styled.div`
  margin-top: 24px;
`;

const MissingHero = styled(FileSearch)`
  flex-shrink: 0;
  color: ${s("textTertiary")};
`;

const EmptyHero = styled(Files)`
  flex-shrink: 0;
  color: ${s("textTertiary")};
`;

const Spinner = styled(LoaderCircle)`
  flex-shrink: 0;
  color: ${s("textSecondary")};
  animation: ${spin} 1s linear infinite;
  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;
