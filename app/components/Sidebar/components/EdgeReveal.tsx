import { useDirection } from "@radix-ui/react-direction";
import { SidebarToggleIcon } from "@shared/components/LucideIcon";
import { memo, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import { depths, s } from "@shared/styles";
import ToggleButton from "./ToggleButton";

interface EdgeRevealProps {
  /** Permanently expands the sidebar when the button is clicked. */
  onExpand: () => void;
}

/**
 * Reveals a clickable sidebar button when the mouse approaches the inline edge.
 * Observes the window so the detection area never blocks page controls.
 *
 * @param props the callback for expanding the sidebar.
 * @returns the animated edge button.
 */
export const EdgeReveal = memo(function EdgeReveal({
  onExpand,
}: EdgeRevealProps) {
  const direction = useDirection();
  const { t } = useTranslation();
  const [isActive, setActive] = useState(false);
  const [isFocused, setFocused] = useState(false);
  const isVisible = isActive || isFocused;

  useEffect(() => {
    const handleReset = () => {
      setActive(false);
      setFocused(false);
    };

    const handlePointerMove = (event: PointerEvent) => {
      // Keep the target stable while clicking; dragging never reveals it.
      if (event.buttons !== 0) {
        return;
      }

      const distance =
        direction === "rtl" ? window.innerWidth - event.clientX : event.clientX;
      setActive(
        event.pointerType === "mouse" &&
          document.hasFocus() &&
          distance >= 0 &&
          distance <= EDGE_WIDTH &&
          event.clientY > 0 &&
          event.clientY < window.innerHeight
      );
    };

    const handlePointerOut = (event: PointerEvent) => {
      if (!event.relatedTarget) {
        setActive(false);
      }
    };

    window.addEventListener("pointermove", handlePointerMove, {
      passive: true,
    });
    window.addEventListener("pointerout", handlePointerOut);
    window.addEventListener("blur", handleReset);
    window.addEventListener("resize", handleReset);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerout", handlePointerOut);
      window.removeEventListener("blur", handleReset);
      window.removeEventListener("resize", handleReset);
    };
  }, [direction]);

  const handleClick = () => {
    onExpand();
  };
  const handleFocus = () => setFocused(true);
  const handleBlur = () => setFocused(false);

  return (
    <EdgeButton
      type="button"
      aria-label={t("Expand sidebar")}
      aria-controls="sidebar"
      aria-expanded={false}
      aria-hidden={!isVisible}
      disabled={!isVisible}
      tabIndex={isVisible ? 0 : -1}
      onClick={handleClick}
      onFocus={handleFocus}
      onBlur={handleBlur}
      $active={isVisible}
      icon={<SidebarToggleIcon aria-hidden />}
    />
  );
});

const EDGE_WIDTH = 56;

const EdgeButton = styled(ToggleButton)<{ $active: boolean }>`
  position: fixed;
  top: 50%;
  inset-inline-start: 12px;
  z-index: ${depths.sidebar + 1};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${s("textSecondary")};
  cursor: pointer;
  opacity: ${(props) => (props.$active ? 1 : 0)};
  visibility: ${(props) => (props.$active ? "visible" : "hidden")};
  pointer-events: ${(props) => (props.$active ? "auto" : "none")};
  transform: translateY(-50%)
    translateX(${(props) => (props.$active ? "0" : "-6px")});
  transition:
    opacity 150ms cubic-bezier(0.23, 1, 0.32, 1),
    transform 150ms cubic-bezier(0.23, 1, 0.32, 1),
    visibility 0s ${(props) => (props.$active ? "0s" : "150ms")};

  &:hover {
    color: ${s("text")};

    @supports (backdrop-filter: blur(4px)) or
      (-webkit-backdrop-filter: blur(4px)) {
      background: ${(props) => props.theme.exui.glass.hoverBackground};
    }
  }

  &:active {
    @supports (backdrop-filter: blur(4px)) or
      (-webkit-backdrop-filter: blur(4px)) {
      background: ${(props) => props.theme.exui.glass.activeBackground};
    }
  }

  &:focus-visible {
    outline: 2px solid ${s("inputBorderFocused")};
    outline-offset: 2px;
  }

  &:dir(rtl) {
    transform: translateY(-50%)
      translateX(${(props) => (props.$active ? "0" : "6px")});

    svg {
      transform: scaleX(-1);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    transform: translateY(-50%);
    transition: none;
  }

  @media (hover: none), (pointer: coarse), print {
    display: none;
  }
`;
