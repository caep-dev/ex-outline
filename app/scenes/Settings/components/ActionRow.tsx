import { glassSurface } from "@shared/styles/glass";
import styled from "styled-components";
import breakpoint from "styled-components-breakpoint";
import { s } from "@shared/styles";
import { HStack } from "~/components/primitives/HStack";

/**
 * A sticky container for action buttons such as "Save" on settings screens.
 */
export const ActionRow = styled(HStack).attrs({
  spacing: 8,
})`
  position: sticky;
  bottom: 0;
  width: 100vw;
  padding: 16px 12px;
  margin-inline-start: -12px;

  background: ${s("background")};

  ${glassSurface}

  ${breakpoint("tablet")`
    width: auto;
  `}
`;
