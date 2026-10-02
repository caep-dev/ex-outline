/**
 *
 * OUTLINE ICON BLOCK
 *
 * import { CollapsedIcon } from "outline-icons";
 */
import { CollapsedIcon } from "@shared/components/LucideIcon";
import * as React from "react";
import styled, { keyframes } from "styled-components";
import { s } from "@shared/styles";
import usePersistedState from "~/hooks/usePersistedState";
import { undraggableOnDesktop } from "~/styles";
import { SectionDragContext } from "./DraggableSection";

interface Props {
  /** Unique header id used to persist the expanded state. */
  id?: string;
  /** Whether the section can be collapsed, defaults to true when an id is set. */
  collapsible?: boolean;
  title: React.ReactNode;
  /** Controls displayed at the end of the title row. */
  actions?: React.ReactNode;
  children?: React.ReactNode;
}

/**
 * Returns the storage key for a sidebar section's expanded state.
 *
 * @param id the section identifier.
 * @returns the storage key.
 */
export function getHeaderExpandedKey(id: string) {
  return `sidebar-header-${id}`;
}

/**
 * Renders a sidebar section heading with optional disclosure and actions.
 *
 * @param props the section heading properties.
 * @returns the heading and its visible section content.
 */
export const Header: React.FC<Props> = ({
  id,
  collapsible = true,
  title,
  actions,
  children,
}: Props) => {
  const [firstRender, setFirstRender] = React.useState(true);
  const dragRef = React.useContext(SectionDragContext);
  const [expanded, setExpanded] = usePersistedState<boolean>(
    getHeaderExpandedKey(id ?? ""),
    true
  );
  const canCollapse = !!id && collapsible;
  const isExpanded = !canCollapse || expanded;

  React.useEffect(() => {
    if (!expanded) {
      setFirstRender(false);
    }
  }, [expanded]);

  const handleClick = React.useCallback(() => {
    setExpanded(!expanded);
  }, [expanded, setExpanded]);

  return (
    <>
      <H3 ref={dragRef}>
        <Button
          as={canCollapse ? "button" : "span"}
          onClick={canCollapse ? handleClick : undefined}
          aria-expanded={canCollapse ? expanded : undefined}
        >
          {title}
          {canCollapse && <Disclosure $expanded={expanded} />}
        </Button>
        {actions}
      </H3>
      {isExpanded &&
        (!canCollapse || firstRender ? children : <Fade>{children}</Fade>)}
    </>
  );
};

export const fadeAndSlideDown = keyframes`
  from {
    opacity: 0;
    transform: translateY(-8px);
  }

  to {
    opacity: 1;
    transform: translateY(0px);
  }
`;

const Fade = styled.span`
  animation: ${fadeAndSlideDown} 100ms ease-in-out;
`;

const Button = styled.button`
  display: flex;
  align-items: center;
  flex: 1;
  min-width: 0;
  width: 100%;
  font-size: ${(props) => props.theme.exui.typography.smallFontSize};
  font-weight: ${(props) => props.theme.exui.typography.fontWeightMedium};
  user-select: none;
  color: ${s("sidebarText")};
  position: relative;
  letter-spacing: 0.03em;
  margin: 0;
  padding-block: 4px;
  padding-inline: 12px 2px;
  border: 0;
  background: none;
  border-radius: ${(props) =>
    props.theme.exui.components.sidebarItem.default.radius};
  -webkit-appearance: none;
  transition: all 100ms ease;
  ${undraggableOnDesktop()}

  &:is(button):not(:disabled):hover,
  &:is(button):not(:disabled):active {
    background: ${s("sidebarHoverBackground")};
    cursor: var(--pointer);
  }

  @media (hover: hover) {
    &:is(button):not(:disabled):hover {
      color: ${s("text")};
    }
  }
`;

const Disclosure = styled(CollapsedIcon)<{ $expanded?: boolean }>`
  width: ${(props) => props.theme.exui.components.sidebarItem.default.iconSize};
  height: ${(props) =>
    props.theme.exui.components.sidebarItem.default.iconSize};
  transition:
    opacity 100ms ease,
    transform 100ms ease,
    fill 50ms !important;
  ${(props) => !props.$expanded && "transform: rotate(-90deg);"};
  opacity: 0;

  [dir="rtl"] & {
    ${(props) => !props.$expanded && "transform: rotate(90deg);"};
  }
`;

const H3 = styled.h3`
  display: flex;
  align-items: center;
  margin: 0;

  &:hover,
  &:focus-within {
    ${Disclosure} {
      opacity: 1;
    }
  }
`;

export default Header;
