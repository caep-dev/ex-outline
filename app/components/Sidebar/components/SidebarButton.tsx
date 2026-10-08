/**
 *
 * OUTLINE ICON BLOCK
 *
 * import { MoreIcon } from "outline-icons";
 */
import { MoreIcon } from "@shared/components/LucideIcon";
import { observer } from "mobx-react";
import * as React from "react";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { extraArea, hover, s } from "@shared/styles";
import Flex from "~/components/Flex";
import Text from "~/components/Text";
import { draggableOnDesktop, undraggableOnDesktop } from "~/styles";
import Desktop from "~/utils/Desktop";
import { HStack } from "~/components/primitives/HStack";

export type SidebarButtonProps = React.ComponentProps<typeof Button> & {
  position?: "top" | "bottom";
  title: React.ReactNode;
  image: React.ReactNode;
  showMoreMenu?: boolean;
  onClick: React.MouseEventHandler<HTMLButtonElement>;
  children?: React.ReactNode;
};

const SidebarButton = observer(
  React.forwardRef<HTMLButtonElement, SidebarButtonProps>(
    function SidebarButton_(
      {
        position = "top",
        showMoreMenu,
        image,
        title,
        children,
        onClick,
        ...rest
      }: SidebarButtonProps,
      ref
    ) {
      return (
        <Container
          justify="space-between"
          align="center"
          shrink={false}
          $position={position}
        >
          <Button
            {...rest}
            onClick={onClick}
            $position={position}
            $iconOnly={!title}
            as="button"
            ref={ref}
            role="button"
          >
            <Content justify={title ? "flex-start" : "center"}>
              {image}
              {title && <Title>{title}</Title>}
            </Content>
            {showMoreMenu && <StyledMoreIcon />}
          </Button>
          {children}
        </Container>
      );
    }
  )
);

const StyledMoreIcon = styled(MoreIcon)`
  flex-shrink: 0;
  width: ${(props) => props.theme.exui.components.sidebarItem.default.iconSize};
  height: ${(props) =>
    props.theme.exui.components.sidebarItem.default.iconSize};
`;

const Container = styled(Flex)<{ $position: "top" | "bottom" }>`
  overflow: hidden;
  gap: ${(props) => (props.$position === "bottom" ? "4px" : "0")};
  padding-top: ${(props) =>
    props.$position === "top" && Desktop.hasInsetTitlebar() ? 40 : 0}px;
  ${draggableOnDesktop()}
`;

const Title = styled(Text)`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Content = styled(HStack)`
  flex-shrink: 1;
  flex-grow: 1;
`;

const Button = styled(Flex)<{
  $position: "top" | "bottom";
  $iconOnly: boolean;
}>`
  flex: ${(props) =>
    props.$position === "bottom" && props.$iconOnly ? "0 0 36px" : "1"};
  box-sizing: border-box;
  color: ${s("textTertiary")};
  align-items: center;
  padding: ${(props) => (props.$position === "bottom" ? "6px 8px" : "12px")};
  font-size: ${(props) =>
    props.theme.exui.components.sidebarItem.default.fontSize};
  font-weight: ${(props) =>
    props.theme.exui.components.sidebarItem.default.fontWeight};
  border-radius: ${(props) =>
    props.theme.exui.components.sidebarItem.default.radius};
  border: 0;
  margin: 8px;
  margin-inline: ${(props) =>
    props.$position === "bottom"
      ? props.$iconOnly
        ? "0 8px"
        : "8px 0"
      : "8px"};
  background: none;
  flex-shrink: 0;
  min-height: ${(props) => (props.$position === "bottom" ? "36px" : "auto")};
  min-width: ${(props) => (props.$position === "bottom" ? "36px" : "0")};
  width: ${(props) =>
    props.$position === "bottom" && props.$iconOnly ? "36px" : "auto"};
  height: ${(props) =>
    props.$position === "bottom" && props.$iconOnly ? "36px" : "auto"};

  -webkit-appearance: none;
  text-decoration: none;
  text-align: start;
  user-select: none;
  position: relative;
  cursor: var(--pointer);

  ${undraggableOnDesktop()}
  ${extraArea(4)}
  ${breakpoint("tablet")`
    padding: ${(props: { $position: "top" | "bottom" }) => (props.$position === "bottom" ? "6px 8px" : "8px")};
  `}

  &:not(:disabled) {
    &: ${hover} {
      background: ${s("sidebarHoverBackground")};
    }

    &:active,
    &[aria-expanded="true"] {
      color: ${s("sidebarText")};
      background: ${s("sidebarActiveBackground")};
    }
  }
`;

export default SidebarButton;
