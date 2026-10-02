import styled from "styled-components";
import type { Props as ActionButtonProps } from "~/components/ActionButton";
import ActionButton from "~/components/ActionButton";
import { undraggableOnDesktop } from "~/styles";

type Props = ActionButtonProps & {
  width?: number | string;
  height?: number | string;
  size?: number;
  type?: "button" | "submit" | "reset";
};

const NudeButton = styled(ActionButton).attrs((props: Props) => ({
  type: "type" in props ? props.type : "button",
}))<Props>`
  width: ${(props) =>
    typeof props.width === "string"
      ? props.width
      : props.width || props.size
        ? `${props.width || props.size}px`
        : "1.5rem"};
  height: ${(props) =>
    typeof props.height === "string"
      ? props.height
      : props.height || props.size
        ? `${props.height || props.size}px`
        : "1.5rem"};
  background: none;
  border-radius: ${(props) => props.theme.exui.components.button.action.radius};
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 0;
  border: 0;
  padding: 0;
  cursor: var(--pointer);
  user-select: none;
  color: inherit;

  > svg.lucide {
    width: ${(props) => props.theme.exui.components.button.icon.iconSize};
    height: ${(props) => props.theme.exui.components.button.icon.iconSize};
    flex-shrink: 0;
  }

  &:focus-visible {
    outline: none;
    box-shadow: ${(props) =>
      props.theme.exui.components.button.ghost.focus.shadow};
  }
  ${undraggableOnDesktop()}
`;

export default NudeButton;
