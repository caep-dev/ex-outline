import styled from "styled-components";
import { Avatar } from "./Avatar";
import { AvatarVariant } from "./Avatar/Avatar";

const TeamLogo = styled(Avatar).attrs({
  variant: AvatarVariant.Square,
})`
  border-radius: ${(props) => props.theme.exui.radii.small};
  border: 0;
`;

export default TeamLogo;
