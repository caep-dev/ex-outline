import { exuiTokens } from "@exre/exui/tokens";
/**
 *
 * OUTLINE ICON BLOCK
 *
 * import { CloseIcon } from "outline-icons";
 */
import { CloseIcon } from "@shared/components/LucideIcon";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import styled from "styled-components";
import { ellipsis } from "@shared/styles";
import { useDocumentContext } from "~/components/DocumentContext";
import Tooltip from "~/components/Tooltip";
import { useClearSearchHighlight } from "~/hooks/useClearSearchHighlight";
import { undraggableOnDesktop } from "~/styles";

export function SearchHighlightChip() {
  const { t } = useTranslation();
  const { editor } = useDocumentContext();
  const location = useLocation();
  const clearSearchHighlight = useClearSearchHighlight();
  const searchHighlight = new URLSearchParams(location.search).get("q");

  const handleClick = useCallback(() => {
    editor?.commands.clearSearch();
    clearSearchHighlight();
  }, [editor, clearSearchHighlight]);

  if (!searchHighlight) {
    return null;
  }

  return (
    <Tooltip
      content={t("Clear search highlight")}
      shortcut="Esc"
      placement="bottom"
    >
      <Chip
        type="button"
        onClick={handleClick}
        aria-label={t("Clear search highlight")}
      >
        <Label>{searchHighlight}</Label>
        <CloseIcon size={16} />
      </Chip>
    </Tooltip>
  );
}

const Chip = styled.button`
  ${undraggableOnDesktop()}
  display: inline-flex;
  align-items: center;
  gap: 2px;
  height: 28px;
  padding: 0 6px 0 10px;
  margin: 0 4px;
  background: ${(props) => props.theme.textHighlight};
  color: ${(props) => props.theme.text};
  border: 0;
  border-radius: ${(props) => props.theme.exui.radii.extraLarge};
  font-size: ${exuiTokens.typography.bodyFontSize};
  font-weight: 500;
  line-height: 1;
  cursor: var(--pointer);
  user-select: none;
  max-width: 200px;

  &:hover {
    background: ${(props) => props.theme.textHighlight};
    box-shadow: ${(props) => props.theme.exui.shadow.focus};
  }

  & > svg {
    flex-shrink: 0;
  }
`;

const Label = styled.span`
  ${ellipsis()}
  line-height: 1.5;
`;
