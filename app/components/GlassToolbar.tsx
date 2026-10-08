import styled from "styled-components";
import { glassSurface } from "@shared/styles/glass";
import { Inner } from "~/components/Button";
import Flex from "~/components/Flex";

/** Groups compact actions on a rounded ExUI glass surface. */
export const GlassToolbar = styled(Flex)`
  ${glassSurface}
  align-items: center;
  flex-shrink: 0;
  gap: 2px;
  padding: 4px;
  border-radius: ${(props) => props.theme.exui.radii.full};
  box-shadow:
    ${(props) => props.theme.exui.glass.shadow},
    inset 0 1px 3px rgba(255, 255, 255, 0.5),
    ${(props) => props.theme.exui.shadow.medium};

  [data-slot="action-button"] {
    height: 32px;
    border-radius: ${(props) => props.theme.exui.radii.full};

    ${Inner} {
      min-height: 0;
    }
  }

  [data-slot="action-button"]:has(> span:only-child > svg:only-child) {
    width: 32px;
  }
`;

/** Allows navigation links to shrink within a compact glass toolbar. */
export const GlassNavigationToolbar = styled(GlassToolbar)`
  flex-shrink: 1;
  min-width: 0;
  max-width: 100%;

  a {
    min-height: 32px;
    margin-inline: 0;
    border-radius: ${(props) => props.theme.exui.radii.full};
  }
`;
