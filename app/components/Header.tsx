import { throttle } from "es-toolkit/compat";
import { observer } from "mobx-react";
import { SidebarToggleIcon } from "@shared/components/LucideIcon";
/**
 *
 * OUTLINE ICON BLOCK
 *
 * import { CloseIcon, MenuIcon } from "outline-icons";
 */
import { CloseIcon, MenuIcon } from "@shared/components/LucideIcon";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { mergeRefs } from "react-merge-refs";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import useMeasure from "react-use-measure";
import { HEADER_HEIGHT } from "@shared/constants";
import { depths } from "@shared/styles";
import { supportsPassiveListener } from "@shared/utils/browser";
import Button from "~/components/Button";
import Fade from "~/components/Fade";
import Flex from "~/components/Flex";
import { GlassToolbar } from "~/components/GlassToolbar";
import { useSplitView } from "~/components/SplitView/context";
import { SidebarToggleContext } from "~/components/SidebarToggleContext";
import Tooltip from "~/components/Tooltip";
import useEventListener from "~/hooks/useEventListener";
import useMobile from "~/hooks/useMobile";
import useStores from "~/hooks/useStores";
import { draggableOnDesktop, fadeOnDesktopBackgrounded } from "~/styles";
import Desktop from "~/utils/Desktop";
import history from "~/utils/history";
import { closeSplitPane } from "~/utils/splitView";
import { TooltipProvider } from "./TooltipContext";
import { websitePublicTranslation } from "~/utils/websitePublicTranslation";

export { HEADER_HEIGHT };

const GLASS_LAYER_COUNT = 8;
const glassLayers = Array.from(
  { length: GLASS_LAYER_COUNT },
  (_, index) => index + 1
);

type Props = {
  left?: React.ReactNode;
  title: React.ReactNode;
  actions?:
    | ((props: { isCompact: boolean }) => React.ReactNode)
    | React.ReactNode;
  hasSidebar?: boolean;
  className?: string;
};

function Header(
  { left, title, actions, hasSidebar, className }: Props,
  ref: React.RefObject<HTMLDivElement> | null
) {
  const { ui } = useStores();
  const { t, i18n } = useTranslation();
  const { pane, isSplitView } = useSplitView();
  const isMobile = useMobile();
  const hasMobileSidebar = hasSidebar && isMobile;
  const canToggleSidebar = React.useContext(SidebarToggleContext);
  const hasDesktopSidebar =
    hasSidebar && canToggleSidebar && !isMobile && pane === "primary";
  const [internalMeasureRef, size] = useMeasure();
  const [breadcrumbsMeasureRef, breadcrumbsSize] = useMeasure();
  const passThrough =
    !actions && !left && !title && !isSplitView && !hasDesktopSidebar;

  const handleOpenSidebar = React.useCallback(() => {
    ui.expandSidebar();
  }, [ui]);

  const handleCloseSplitPane = React.useCallback(() => {
    closeSplitPane(history, pane);
  }, [pane]);

  const [isScrolled, setScrolled] = React.useState(false);
  const handleScroll = React.useMemo(
    () => throttle(() => setScrolled(window.scrollY > 75), 50),
    []
  );

  useEventListener(
    "scroll",
    handleScroll,
    window,
    supportsPassiveListener ? { passive: true } : { capture: false }
  );

  const handleClickTitle = React.useCallback(() => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }, []);

  const setBreadcrumbRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      if (node?.firstElementChild) {
        breadcrumbsMeasureRef(node.firstElementChild as HTMLDivElement);
      }
    },
    [breadcrumbsMeasureRef]
  );

  const breadcrumbMakesCompact = breadcrumbsSize.width > size.width / 3;
  const isCompact = size.width < 1000 || breadcrumbMakesCompact;

  return (
    <TooltipProvider>
      <Wrapper
        ref={mergeRefs([ref, internalMeasureRef])}
        align="center"
        shrink={false}
        className={className}
        $passThrough={passThrough}
        $insetTitleAdjust={ui.sidebarIsClosed && Desktop.hasInsetTitlebar()}
      >
        {!passThrough && (
          <GlassBackground aria-hidden="true">
            {glassLayers.map((step) => (
              <GlassBlurLayer key={step} $step={step} />
            ))}
          </GlassBackground>
        )}
        {hasDesktopSidebar && (
          <SidebarToggleSlot
            $visible={ui.sidebarIsClosed}
            aria-hidden={!ui.sidebarIsClosed}
          >
            <GlassToolbar data-sidebar-toggle-toolbar>
              <Tooltip content={t("Expand sidebar")} side="bottom">
                <Button
                  onClick={handleOpenSidebar}
                  icon={<SidebarToggleIcon aria-hidden />}
                  aria-label={t("Expand sidebar")}
                  aria-controls="sidebar"
                  aria-expanded={!ui.sidebarIsClosed}
                  disabled={!ui.sidebarIsClosed}
                  tabIndex={ui.sidebarIsClosed ? 0 : -1}
                  neutral
                  borderOnHover
                />
              </Tooltip>
            </GlassToolbar>
          </SidebarToggleSlot>
        )}
        {left || hasMobileSidebar ? (
          <Breadcrumbs ref={setBreadcrumbRef}>
            {hasMobileSidebar && (
              <MobileMenuButton
                onClick={ui.toggleMobileSidebar}
                icon={<MenuIcon />}
                aria-label={
                  ui.mobileSidebarVisible
                    ? t(
                        "Close sidebar",
                        websitePublicTranslation(
                          i18n.language,
                          "Close sidebar",
                          "关闭侧边栏"
                        )
                      )
                    : t("Expand sidebar")
                }
                aria-controls="sidebar"
                aria-expanded={ui.mobileSidebarVisible}
                neutral
              />
            )}
            {left}
          </Breadcrumbs>
        ) : null}

        {isScrolled && !isCompact ? (
          <Title onClick={handleClickTitle}>
            <Fade>{title}</Fade>
          </Title>
        ) : (
          <div />
        )}
        <Actions align="center" justify="flex-end">
          {typeof actions === "function" ? actions({ isCompact }) : actions}
          {isSplitView && (
            <Tooltip content={t("Close pane")} side="bottom">
              <CloseSplitPaneButton
                aria-label={t("Close pane")}
                onClick={handleCloseSplitPane}
                icon={<CloseIcon />}
                neutral
                borderOnHover
              />
            </Tooltip>
          )}
        </Actions>
      </Wrapper>
    </TooltipProvider>
  );
}

interface SidebarToggleSlotProps {
  $visible: boolean;
}

const SidebarToggleSlot = styled.div<SidebarToggleSlotProps>`
  display: flex;
  align-items: center;
  flex-shrink: 0;
  width: ${(props) => (props.$visible ? "48px" : "0")};
  opacity: ${(props) => (props.$visible ? 1 : 0)};
  transform: translateX(${(props) => (props.$visible ? 0 : "-6px")});
  visibility: ${(props) => (props.$visible ? "visible" : "hidden")};
  pointer-events: ${(props) => (props.$visible ? "auto" : "none")};
  overflow: ${(props) => (props.$visible ? "visible" : "hidden")};
  transition:
    width 180ms ease-out,
    opacity 180ms ease-out,
    transform 180ms ease-out,
    visibility 0s ${(props) => (props.$visible ? "0s" : "180ms")};

  [dir="rtl"] & {
    transform: translateX(${(props) => (props.$visible ? 0 : "6px")});
    svg {
      transform: scaleX(-1);
    }
  }
`;

const Breadcrumbs = styled("div")`
  flex-grow: 1;
  flex-basis: 0;
  min-width: 0;
  align-items: center;
  padding-inline: 0 8px;
  display: flex;

  ${breakpoint("tablet")`
    min-width: auto;
  `};
`;

const Actions = styled(Flex)`
  flex-grow: 1;
  flex-basis: 0;
  min-width: auto;
  padding-inline: 8px 0;
  gap: 8px;
  margin-inline-start: 8px;

  ${breakpoint("tablet")`
    position: unset;
  `};
`;

type WrapperProps = {
  $passThrough?: boolean;
  $insetTitleAdjust?: boolean;
};

const GlassBackground = styled("div")`
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background: ${(props) => props.theme.exui.glass.fallbackBackground};

  @supports (backdrop-filter: blur(4px)) or (-webkit-backdrop-filter: blur(4px)) {
    background: transparent;

    &::after {
      content: "";
      position: absolute;
      inset: 0;
      background: ${(props) => props.theme.exui.glass.background};
      /* Fade the tint along the same quadratic curve as the blur. */
      -webkit-mask-image: linear-gradient(
        to top,
        transparent,
        rgba(0, 0, 0, 0.0625) 25%,
        rgba(0, 0, 0, 0.25) 50%,
        rgba(0, 0, 0, 0.5625) 75%,
        black
      );
      mask-image: linear-gradient(
        to top,
        transparent,
        rgba(0, 0, 0, 0.0625) 25%,
        rgba(0, 0, 0, 0.25) 50%,
        rgba(0, 0, 0, 0.5625) 75%,
        black
      );
    }
  }
`;

const GlassBlurLayer = styled("div")<{ $step: number }>`
  position: absolute;
  inset: 0;

  @supports (backdrop-filter: blur(4px)) or (-webkit-backdrop-filter: blur(4px)) {
    /* Gaussian variances add; incremental radii produce a quadratic ramp. */
    --header-glass-blur: calc(
      ${(props) => props.theme.exui.glass.blur} *
        ${(props) =>
          Math.sqrt(
            (props.$step / GLASS_LAYER_COUNT) ** 4 -
              ((props.$step - 1) / GLASS_LAYER_COUNT) ** 4
          )}
    );
    --header-glass-mask: linear-gradient(
      to top,
      transparent ${(props) => ((props.$step - 1) / GLASS_LAYER_COUNT) * 100}%,
      black ${(props) => (props.$step / GLASS_LAYER_COUNT) * 100}%
    );
    backdrop-filter: blur(var(--header-glass-blur))
      saturate(
        ${(props) =>
          props.theme.exui.glass.saturation ** (1 / GLASS_LAYER_COUNT)}
      );
    -webkit-backdrop-filter: blur(var(--header-glass-blur))
      saturate(
        ${(props) =>
          props.theme.exui.glass.saturation ** (1 / GLASS_LAYER_COUNT)}
      );
    -webkit-mask-image: var(--header-glass-mask);
    mask-image: var(--header-glass-mask);
  }
`;

const Wrapper = styled(Flex)<WrapperProps>`
  top: 0;
  z-index: ${depths.header};
  position: sticky;
  background: transparent;
  pointer-events: ${(props) => (props.$passThrough ? "none" : "auto")};

  padding: 12px 16px;
  transform: translate3d(0, 0, 0);
  min-height: ${HEADER_HEIGHT}px;
  justify-content: flex-start;
  ${draggableOnDesktop()}

  button,
  [role="button"] {
    ${fadeOnDesktopBackgrounded()}
  }

  @media print {
    display: none;
  }

  ${breakpoint("tablet")`
    padding: 12px;
    ${(props: WrapperProps) => props.$insetTitleAdjust && `padding-left: 64px;`}
    `};
`;

const Title = styled("div")`
  display: none;
  font-size: 1rem;
  font-weight: ${(props) => props.theme.exui.typography.fontWeightMedium};
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
  cursor: var(--pointer);
  min-width: 0;

  ${breakpoint("tablet")`
    padding-left: 0;
    display: block;
  `};

  svg {
    vertical-align: bottom;
  }

  @media (display-mode: standalone) {
    overflow: hidden;
    flex-grow: 0 !important;
  }
`;

const MobileMenuButton = styled(Button)`
  margin-right: 8px;
  pointer-events: auto;

  @media print {
    display: none;
  }
`;

const CloseSplitPaneButton = styled(Button)`
  pointer-events: auto;
`;

export default observer(React.forwardRef(Header));
