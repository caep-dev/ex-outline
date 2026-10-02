import * as Dialog from "@radix-ui/react-dialog";
import { observer } from "mobx-react";
/**
 *
 * OUTLINE ICON BLOCK
 *
 * import { CloseIcon, BackIcon } from "outline-icons";
 */
import { CloseIcon, BackIcon } from "@shared/components/LucideIcon";
import * as React from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { depths } from "@shared/styles";
import Flex from "~/components/Flex";
import NudeButton from "~/components/NudeButton";
import Scrollable from "~/components/Scrollable";
import Text from "~/components/Text";
import useMobile from "~/hooks/useMobile";
import usePrevious from "~/hooks/usePrevious";
import { fadeAndScaleIn, fadeIn } from "~/styles/animations";
import Desktop from "~/utils/Desktop";
import ErrorBoundary from "./ErrorBoundary";
import Tooltip from "./Tooltip";
import { useDialogContext } from "~/components/DialogContext";

type Props = {
  children?: React.ReactNode;
  isOpen: boolean;
  title?: React.ReactNode;
  style?: React.CSSProperties;
  width?: number | string;
  height?: number | string;
  /** Uses width and height as fixed desktop dimensions, bounded by the viewport. */
  fixedSize?: boolean;
  /** Whether to center the desktop dialog vertically. */
  centered?: boolean;
  /** Overrides the spacing in pixels between the title and content. */
  contentGap?: number;
  /** Overrides focus restoration when the dialog closes. */
  onCloseAutoFocus?: Dialog.DialogContentProps["onCloseAutoFocus"];
  onRequestClose: () => void;
};

const Modal: React.FC<Props> = ({
  children,
  isOpen,
  title,
  style,
  width,
  height,
  fixedSize = false,
  centered = false,
  contentGap,
  onCloseAutoFocus,
  onRequestClose,
}: Props) => {
  const wasOpen = usePrevious(isOpen);
  const isMobile = useMobile();
  const { t } = useTranslation();
  const resolvedTitle = title ?? t("Untitled");
  const dialog = useDialogContext();

  const onClose = React.useCallback(() => {
    dialog.setAnimating(false); // Reset
    onRequestClose();
  }, [dialog, onRequestClose]);

  if (!isOpen && !wasOpen) {
    return null;
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <StyledOverlay />
        <StyledContent
          $centered={centered}
          onCloseAutoFocus={onCloseAutoFocus}
          onEscapeKeyDown={(event) => {
            if (event.isComposing) {
              event.preventDefault();
              return;
            }
            onClose();
          }}
          onPointerDownOutside={onClose}
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) {
              onClose();
            }
          }}
          aria-describedby={undefined}
        >
          {isMobile ? (
            <Mobile>
              <MobileContent>
                <Centered
                  $contentGap={contentGap}
                  onClick={(ev) => ev.stopPropagation()}
                  column
                >
                  <Dialog.Title asChild>
                    <Text size="xlarge" weight="bold">
                      {resolvedTitle}
                    </Text>
                  </Dialog.Title>
                  <ErrorBoundary>{children}</ErrorBoundary>
                </Centered>
              </MobileContent>
              <Close onClick={onClose} aria-label={t("Close")}>
                <CloseIcon />
              </Close>
              <Back onClick={onClose}>
                <BackIcon />
                <Text>{t("Back")} </Text>
              </Back>
            </Mobile>
          ) : (
            <Wrapper
              $width={width}
              $height={height}
              $centered={centered}
              $fixedSize={fixedSize}
            >
              <Centered
                $contentGap={contentGap}
                onClick={(ev) => ev.stopPropagation()}
                // maxHeight needed for proper overflow behavior in Safari
                style={{
                  maxHeight: fixedSize ? "100%" : "65vh",
                  height: fixedSize ? "100%" : undefined,
                  width: centered ? "100%" : undefined,
                }}
                column
                reverse
              >
                <DesktopContent
                  $fixedSize={fixedSize}
                  style={style}
                  topShadow
                  overflow={dialog.animating ? "hidden" : undefined}
                  onAnimationEnd={() => dialog.setAnimating(false)}
                >
                  <ErrorBoundary component="div">{children}</ErrorBoundary>
                </DesktopContent>
                <Header>
                  <Dialog.Title asChild>
                    <DesktopTitle>{resolvedTitle}</DesktopTitle>
                  </Dialog.Title>
                  <Tooltip content={t("Close")} shortcut="Esc">
                    <DesktopCloseButton
                      onClick={onClose}
                      aria-label={t("Close")}
                    >
                      <CloseIcon />
                    </DesktopCloseButton>
                  </Tooltip>
                </Header>
              </Centered>
            </Wrapper>
          )}
        </StyledContent>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

const StyledOverlay = styled(Dialog.Overlay)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: ${(props) =>
    props.theme.exui.components.dialog.overlay.background} !important;
  backdrop-filter: blur(
    ${(props) => props.theme.exui.components.dialog.overlay.backdropBlur}
  );
  z-index: ${depths.overlay};
  animation: ${fadeIn}
    ${(props) => props.theme.exui.components.dialog.overlay.duration} ease;
`;

const StyledContent = styled(Dialog.Content)<{ $centered: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: ${depths.modal};
  display: flex;
  justify-content: center;
  align-items: ${(props) => (props.$centered ? "center" : "flex-start")};
  outline: none;
`;

const Mobile = styled.div`
  animation: ${fadeAndScaleIn} 250ms ease;

  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: ${depths.modal};
  display: flex;
  justify-content: center;
  align-items: flex-start;
  background: ${(props) => props.theme.exui.surface.background};
  outline: none;
`;

const MobileContent = styled(Scrollable)`
  width: 100%;
  padding: 8vh 12px;

  ${breakpoint("tablet")`
    padding: 13vh 2rem 2rem;
  `};
`;

const DesktopContent = styled(Scrollable)<{ $fixedSize: boolean }>`
  /* Leave room for field focus shadows without shifting content alignment. */
  margin: -4px;
  padding: 4px;
  ${(props) => props.$fixedSize && "flex: 1; min-height: 0; height: auto;"}
  color: ${(props) => props.theme.exui.components.dialog.surface.foreground};
`;

const Centered = styled(Flex)<{ $contentGap?: number }>`
  width: 640px;
  max-width: 100%;
  position: relative;
  margin: 0 auto;
  gap: ${(props) =>
    props.$contentGap !== undefined
      ? `${props.$contentGap}px`
      : props.theme.exui.components.dialog.surface.gap};
`;

const Close = styled(NudeButton)`
  position: absolute;
  display: block;
  top: 0;
  right: 0;
  margin: 12px;
  opacity: 0.75;
  color: ${(props) => props.theme.exui.surface.foreground};
  width: ${(props) => props.theme.exui.density.compact.controlHeight};
  height: ${(props) => props.theme.exui.density.compact.controlHeight};

  &:hover {
    opacity: 1;
  }

  ${breakpoint("tablet")`
    display: none;
  `};
`;

const Back = styled(NudeButton)`
  position: absolute;
  display: none;
  align-items: center;
  top: ${Desktop.hasInsetTitlebar() ? "3rem" : "2rem"};
  left: 2rem;
  opacity: 0.75;
  color: ${(props) => props.theme.exui.surface.foreground};
  font-weight: ${(props) => props.theme.exui.typography.fontWeightMedium};
  width: auto;
  height: auto;

  &:hover {
    opacity: 1;
  }

  ${breakpoint("tablet")`
    display: flex;
  `};
`;

const Header = styled(Flex)`
  color: ${(props) => props.theme.exui.components.dialog.title.foreground};
  align-items: center;
  justify-content: space-between;
  font-family: ${(props) =>
    props.theme.exui.components.dialog.title.fontFamily};
  font-size: ${(props) => props.theme.exui.components.dialog.title.fontSize};
  font-weight: ${(props) =>
    props.theme.exui.components.dialog.title.fontWeight};
  line-height: ${(props) =>
    props.theme.exui.components.dialog.title.lineHeight};
  padding: 0;
  flex-shrink: 0;
  gap: ${(props) => props.theme.exui.components.dialog.body.gap};

  // Allows a long title to wrap or truncate instead of pushing out the close
  // button
  > :first-child {
    min-width: 0;
  }

  > :last-child {
    flex-shrink: 0;
  }
`;

const DesktopTitle = styled(Text)`
  color: ${(props) => props.theme.exui.components.dialog.title.foreground};
  font-family: ${(props) =>
    props.theme.exui.components.dialog.title.fontFamily};
  font-size: ${(props) => props.theme.exui.components.dialog.title.fontSize};
  font-weight: ${(props) =>
    props.theme.exui.components.dialog.title.fontWeight};
  line-height: ${(props) =>
    props.theme.exui.components.dialog.title.lineHeight};
`;

const DesktopCloseButton = styled(NudeButton)`
  width: ${(props) => props.theme.exui.components.button.icon.height};
  height: ${(props) => props.theme.exui.components.button.icon.height};
  padding: ${(props) =>
    `0 ${props.theme.exui.components.button.icon.paddingInline}`};
  color: ${(props) =>
    props.theme.exui.components.button.ghost.default.foreground};
  background: ${(props) =>
    props.theme.exui.components.button.ghost.default.background};
  border: 1px solid
    ${(props) => props.theme.exui.components.button.ghost.default.border};
  border-radius: ${(props) => props.theme.exui.components.button.icon.radius};
  box-shadow: ${(props) =>
    props.theme.exui.components.button.ghost.default.shadow};
  opacity: ${(props) =>
    props.theme.exui.components.button.ghost.default.opacity};
  vertical-align: middle;

  > svg {
    width: ${(props) => props.theme.exui.components.button.icon.iconSize};
    height: ${(props) => props.theme.exui.components.button.icon.iconSize};
  }

  &:hover {
    color: ${(props) =>
      props.theme.exui.components.button.ghost.hover.foreground};
    background: ${(props) =>
      props.theme.exui.components.button.ghost.hover.background};
    border-color: ${(props) =>
      props.theme.exui.components.button.ghost.hover.border};
    box-shadow: ${(props) =>
      props.theme.exui.components.button.ghost.hover.shadow};
    opacity: ${(props) =>
      props.theme.exui.components.button.ghost.hover.opacity};
  }

  &:active {
    color: ${(props) =>
      props.theme.exui.components.button.ghost.active.foreground};
    background: ${(props) =>
      props.theme.exui.components.button.ghost.active.background};
    border-color: ${(props) =>
      props.theme.exui.components.button.ghost.active.border};
    box-shadow: ${(props) =>
      props.theme.exui.components.button.ghost.active.shadow};
    opacity: ${(props) =>
      props.theme.exui.components.button.ghost.active.opacity};
  }

  &:focus-visible {
    outline: none;
    color: ${(props) =>
      props.theme.exui.components.button.ghost.focus.foreground};
    background: ${(props) =>
      props.theme.exui.components.button.ghost.focus.background};
    border-color: ${(props) =>
      props.theme.exui.components.button.ghost.focus.border};
    box-shadow: ${(props) =>
      props.theme.exui.components.button.ghost.focus.shadow};
    opacity: ${(props) =>
      props.theme.exui.components.button.ghost.focus.opacity};
  }
`;

const Wrapper = styled.div<{
  $width?: number | string;
  $height?: number | string;
  $centered: boolean;
  $fixedSize: boolean;
}>`
  animation: ${fadeAndScaleIn} 250ms ease;

  margin: ${(props) => (props.$centered ? "auto" : "25vh auto auto auto")};
  ${(props) => props.$fixedSize && "box-sizing: border-box;"}
  width: ${(props) =>
    props.$fixedSize ? formatSize(props.$width) || "450px" : "75vw"};
  height: ${(props) =>
    props.$fixedSize ? formatSize(props.$height) || "auto" : "auto"};
  min-width: ${(props) => (props.$fixedSize ? "0" : "350px")};
  max-width: ${(props) =>
    props.$fixedSize ? "calc(100vw - 48px)" : props.$width || "450px"};
  max-height: ${(props) =>
    props.$fixedSize ? "calc(100dvh - 64px)" : props.$height || "70vh"};
  z-index: ${depths.modal};
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: ${(props) => props.theme.exui.components.dialog.surface.padding};
  background: ${(props) =>
    props.theme.exui.components.dialog.surface.background};
  color: ${(props) => props.theme.exui.components.dialog.surface.foreground};
  box-shadow: ${(props) => props.theme.exui.components.dialog.surface.shadow};
  border: 1px solid
    ${(props) => props.theme.exui.components.dialog.surface.border};
  border-radius: ${(props) =>
    props.theme.exui.components.dialog.surface.radius};
  font-family: ${(props) => props.theme.exui.typography.fontFamily};
  outline: none;
`;

const formatSize = (value?: number | string) =>
  typeof value === "number" ? `${value}px` : value;

export default observer(Modal);
