import { uniqueId } from "es-toolkit/compat";
import { LayoutGroup } from "framer-motion";
import * as React from "react";
import styled from "styled-components";
import useWindowSize from "~/hooks/useWindowSize";

const Nav = styled.nav<{ $shadowVisible?: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: fit-content;
  max-width: 100%;
  height: ${(props) => props.theme.exui.components.tabs.list.height};
  padding: ${(props) => props.theme.exui.components.tabs.list.padding};
  gap: ${(props) => props.theme.exui.components.tabs.list.gap};
  border: 0;
  border-radius: ${(props) => props.theme.exui.radii.full};
  background: ${(props) =>
    props.theme.exui.components.tabs.default.listBackground};
  color: ${(props) => props.theme.exui.components.tabs.list.foreground};
  margin: 12px 0;
  overflow-x: auto;
  overflow-y: hidden;
  white-space: nowrap;

  -ms-overflow-style: none;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }

  &:after {
    content: "";
    position: absolute;
    top: 0;
    right: 0;
    width: 50px;
    height: 100%;
    pointer-events: none;
    background: ${(props) =>
      props.$shadowVisible
        ? `linear-gradient(
      90deg,
      transparent 0%,
      ${props.theme.exui.surface.background} 100%
    )`
        : `transparent`};
  }
`;

// When sticky we need extra background coverage around the sides otherwise
// items that scroll past can "stick out" the sides of the heading
const Sticky = styled.div`
  position: sticky;
  top: 54px;
  margin: 0 -8px;
  padding: 0 8px;
  background: ${(props) => props.theme.exui.surface.background};
  z-index: 1;
`;

export const Separator = styled.span`
  border-left: 1px solid ${(props) => props.theme.exui.surface.divider};
  position: relative;
  top: 2px;
  margin-top: 6px;
`;

type Props = {
  children?: React.ReactNode;
};

/**
 * Preserves an isolated layout context for tabs composed outside of `Tabs`.
 */
export const TabsGroup: React.FC = ({ children }: Props) => {
  const layoutGroupId = React.useMemo(() => uniqueId("tabs-"), []);
  return <LayoutGroup id={layoutGroupId}>{children}</LayoutGroup>;
};

export const Tabs: React.FC = ({ children }: Props) => {
  const ref = React.useRef<HTMLElement>(null);
  const [shadowVisible, setShadow] = React.useState(false);
  const { width } = useWindowSize();

  const updateShadows = React.useCallback(() => {
    const c = ref.current;
    if (!c) {
      return;
    }
    const scrollLeft = c.scrollLeft;
    const wrapperWidth = c.scrollWidth - c.clientWidth;
    const fade = !!(wrapperWidth - scrollLeft !== 0);

    if (fade !== shadowVisible) {
      setShadow(fade);
    }
  }, [shadowVisible]);

  React.useEffect(() => {
    updateShadows();
  }, [width, updateShadows]);

  return (
    <TabsGroup>
      <Sticky>
        <Nav ref={ref} onScroll={updateShadows} $shadowVisible={shadowVisible}>
          {children}
        </Nav>
      </Sticky>
    </TabsGroup>
  );
};
