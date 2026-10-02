import { observer } from "mobx-react";
import * as React from "react";
import { mergeRefs } from "react-merge-refs";
import { useLocation } from "react-router-dom";
import styled, { useTheme } from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { depths, s } from "@shared/styles";
import { Avatar } from "~/components/Avatar";
import Flex from "~/components/Flex";
import { SidebarToggleContext } from "~/components/SidebarToggleContext";
import useCurrentUser from "~/hooks/useCurrentUser";
import useMobile from "~/hooks/useMobile";
import usePrevious from "~/hooks/usePrevious";
import { useResizeHandle } from "~/hooks/useResizeHandle";
import useStores from "~/hooks/useStores";
import AccountMenu from "~/menus/AccountMenu";
import { fadeOnDesktopBackgrounded } from "~/styles";
import { fadeIn } from "~/styles/animations";
import NotificationIcon from "../Notifications/NotificationIcon";
import NotificationsPopover from "../Notifications/NotificationsPopover";
import { TooltipProvider } from "../TooltipContext";
import ResizeBorder from "./components/ResizeBorder";
import SidebarButton from "./components/SidebarButton";
import { EdgeReveal } from "./components/EdgeReveal";
import { useTranslation } from "react-i18next";
import { useDirection } from "@radix-ui/react-direction";

const ANIMATION_MS = 250;

type Props = {
  /** Whether to hide the sidebar content (sets opacity to 0). */
  hidden?: boolean;
  /** Whether the sidebar can be collapsed, defaults to true. */
  canCollapse?: boolean;
  /** Whether to show the account menu for the signed-in user, defaults to true. */
  showAccountMenu?: boolean;
  /** CSS class name(s) to apply to the sidebar container. */
  className?: string;
  /** Content to render inside the sidebar. */
  children: React.ReactNode;
};

const Sidebar = React.forwardRef<HTMLDivElement, Props>(function Sidebar_(
  {
    children,
    hidden = false,
    canCollapse = true,
    showAccountMenu = true,
    className,
  }: Props,
  ref: React.RefObject<HTMLDivElement>
) {
  const [isCollapsing, setCollapsing] = React.useState(false);
  const { t } = useTranslation();
  const theme = useTheme();
  const { ui } = useStores();
  const location = useLocation();
  const previousLocation = usePrevious(location);
  const user = useCurrentUser({ rejectOnEmpty: false });
  const isMobile = useMobile();
  const width = ui.sidebarWidth;
  const collapsed = ui.sidebarIsClosed && canCollapse;
  const canToggleSidebar = React.useContext(SidebarToggleContext);
  const isClosed = isMobile ? !ui.mobileSidebarVisible : collapsed;
  const maxWidth = theme.sidebarMaxWidth;
  const minWidth = theme.sidebarResizeMinWidth;
  const direction = useDirection();

  const [offset, setOffset] = React.useState(0);
  const [isAnimating, setAnimating] = React.useState(false);
  const isSmallerThanMinimum = width < minWidth;
  const internalRef = React.useRef<HTMLDivElement | null>(null);
  const mergedRef = React.useMemo(() => mergeRefs([internalRef, ref]), [ref]);

  const measure = React.useCallback(
    (event: MouseEvent) =>
      direction === "rtl" ? offset - event.pageX : event.pageX - offset,
    [offset, direction]
  );

  const handleResize = React.useCallback(
    (newWidth: number) => {
      const isSmallerThanCollapsePoint = newWidth < minWidth / 2;

      if (canCollapse) {
        ui.set({
          sidebarWidth: isSmallerThanCollapsePoint
            ? theme.sidebarCollapsedWidth
            : newWidth,
        });
      } else {
        ui.set({ sidebarWidth: Math.max(newWidth, minWidth) });
      }
    },
    [ui, theme, minWidth, canCollapse]
  );

  const handleResizeEnd = React.useCallback(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    if (isSmallerThanMinimum) {
      const isSmallerThanCollapsePoint = width < minWidth / 2;

      if (isSmallerThanCollapsePoint && canCollapse) {
        setAnimating(false);
        setCollapsing(true);
        ui.collapseSidebar();
      } else {
        ui.set({ sidebarWidth: minWidth });
        setAnimating(true);
      }
    } else if (width > maxWidth) {
      ui.set({ sidebarWidth: maxWidth });
      setAnimating(true);
    }
  }, [ui, isSmallerThanMinimum, minWidth, maxWidth, width, canCollapse]);

  // The lower bound is the collapse gesture rather than a stop, so only the maximum is stretchable.
  const { isResizing, startResize } = useResizeHandle({
    measure,
    onResize: handleResize,
    onResizeEnd: handleResizeEnd,
    max: maxWidth,
  });

  const handleMouseDown = React.useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      if (!document.hasFocus()) {
        return;
      }

      setOffset(
        direction === "rtl" ? event.pageX + width : event.pageX - width
      );
      setAnimating(false);
      startResize(event);
    },
    [width, direction, startResize]
  );

  React.useEffect(() => {
    const el = internalRef.current;
    if (!el) {
      return;
    }

    if (isClosed) {
      // Prevent hidden links from receiving keyboard focus during the exit animation.
      el.setAttribute("inert", "");
      if (
        document.activeElement instanceof HTMLElement &&
        el.contains(document.activeElement)
      ) {
        document.activeElement.blur();
      }
    } else {
      el.removeAttribute("inert");
    }
  }, [isClosed]);

  React.useEffect(() => {
    if (isAnimating) {
      setTimeout(() => setAnimating(false), ANIMATION_MS);
    }
  }, [isAnimating]);

  React.useEffect(() => {
    if (isCollapsing) {
      setTimeout(() => {
        ui.set({ sidebarWidth: minWidth });
        setCollapsing(false);
      }, ANIMATION_MS);
    }
  }, [ui, minWidth, isCollapsing]);

  const handleReset = React.useCallback(() => {
    ui.set({ sidebarWidth: theme.sidebarWidth });
  }, [ui, theme.sidebarWidth]);

  React.useEffect(() => {
    ui.setSidebarResizing(isResizing);
  }, [ui, isResizing]);

  React.useEffect(() => {
    if (location !== previousLocation) {
      ui.hideMobileSidebar();
    }
  }, [ui, location, previousLocation]);

  const style = React.useMemo(
    () => ({
      width: `${width}px`,
    }),
    [width]
  );

  const handleCloseSidebar = () => {
    ui.toggleMobileSidebar();
  };

  return (
    <TooltipProvider>
      <Container
        id="sidebar"
        ref={mergedRef}
        style={style}
        $hidden={hidden}
        aria-hidden={isClosed}
        $isClosed={isClosed}
        $isAnimating={isAnimating}
        $mobileSidebarVisible={ui.mobileSidebarVisible}
        $collapsed={collapsed}
        $isMobile={isMobile}
        className={className}
        column
      >
        {children}

        {user && showAccountMenu && (
          <AccountMenu>
            <SidebarButton
              showMoreMenu
              title={user.name}
              position="bottom"
              image={
                <Avatar
                  alt={t("Avatar of {{ name }}", { name: user.name })}
                  model={user}
                  size={24}
                  showHoverCard={false}
                />
              }
            >
              <NotificationsPopover>
                <SidebarButton
                  position="bottom"
                  image={<NotificationIcon />}
                  aria-label={t("Notifications")}
                  style={{ paddingInline: 4 }}
                />
              </NotificationsPopover>
            </SidebarButton>
          </AccountMenu>
        )}
        {!collapsed && !isMobile && (
          <ResizeBorder
            onMouseDown={handleMouseDown}
            onDoubleClick={handleReset}
          />
        )}
      </Container>
      {collapsed && !isMobile && !hidden && canToggleSidebar && (
        <EdgeReveal onExpand={ui.expandSidebar} />
      )}
      {ui.mobileSidebarVisible && <Backdrop onClick={handleCloseSidebar} />}
    </TooltipProvider>
  );
});

const Backdrop = styled.a`
  animation: ${fadeIn} 250ms ease-in-out;
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  cursor: default;
  z-index: ${depths.mobileSidebar - 1};
  background: ${s("backdrop")};
`;

type ContainerProps = {
  $mobileSidebarVisible: boolean;
  $isAnimating: boolean;
  $isClosed: boolean;
  $collapsed: boolean;
  $hidden: boolean;
  $isMobile: boolean;
};

const Container = styled(Flex)<ContainerProps>`
  position: fixed;
  top: 0;
  bottom: 0;
  inset-inline-start: 0;
  width: 100%;
  background: ${s("sidebarBackground")};
  visibility: ${(props) => (props.$isClosed ? "hidden" : "visible")};
  pointer-events: ${(props) => (props.$isClosed ? "none" : "auto")};
  transition:
    visibility 0s ${(props) => (props.$isClosed ? "250ms" : "0s")},
    box-shadow 150ms ease-in-out,
    transform 250ms cubic-bezier(0.34, 1.15, 0.64, 1)
      ${(props: ContainerProps) =>
        props.$isAnimating ? `, width ${ANIMATION_MS}ms ease-out` : ""};
  transform: translateX(
    ${(props) => (props.$mobileSidebarVisible ? 0 : "-100%")}
  );
  z-index: ${depths.mobileSidebar};
  max-width: 80%;
  min-width: 280px;
  padding-inline-start: var(--sal);
  ${fadeOnDesktopBackgrounded()}

  [dir="rtl"] & {
    transform: translateX(
      ${(props) => (props.$mobileSidebarVisible ? 0 : "100%")}
    );
  }

  @media print {
    display: none;
    transform: none;
  }

  & > div {
    transition: opacity 150ms ease-in-out;
    opacity: ${(props) => {
      if (props.$hidden) {
        return "0";
      }
      if (props.$isMobile) {
        return props.$mobileSidebarVisible ? "1" : "0";
      } else {
        return props.$collapsed ? "0" : "1";
      }
    }};
  }

  ${breakpoint("tablet")`
    z-index: ${depths.sidebar};
    margin: 0;
    min-width: 0;
    transition:
      visibility 0s ${(props: ContainerProps) =>
        props.$isClosed ? "150ms" : "0s"},
      box-shadow 150ms ease-in-out,
      transform 150ms ease-out${(props: ContainerProps) =>
        props.$isAnimating ? `, width ${ANIMATION_MS}ms ease-out` : ""};
    transform: translateX(${(props: ContainerProps) =>
      props.$collapsed ? "-100%" : 0});

    [dir="rtl"] & {
      transform: translateX(${(props: ContainerProps) =>
        props.$collapsed ? "100%" : 0});
    }

  `};
`;

export default observer(Sidebar);
