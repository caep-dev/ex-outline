import { exuiTokens } from "@exre/exui/tokens";
import type { ReactNode } from "react";
import styled from "styled-components";
import { s } from "@shared/styles";
import { glassSurface } from "@shared/styles/glass";
import env from "~/env";
import { draggableOnDesktop, undraggableOnDesktop } from "~/styles";
import Desktop from "~/utils/Desktop";

interface SidebarBrandProps {
  children?: ReactNode;
}

/**
 * Displays the Exre Service wordmark linking to Website when configured.
 *
 * @param props the independent sidebar controls to show beside the logo.
 * @returns the sidebar brand header.
 */
export function SidebarBrand({ children }: SidebarBrandProps) {
  return (
    <Container>
      <Logo href={env.WEBSITE_URL || env.URL || "/"}>
        <Icon aria-hidden>
          <Mark viewBox="0 0 1024 1024" focusable="false">
            <path d="M567.469 508.934L270.636 215.422C269.365 214.166 270.255 212 272.042 212H524.028C524.556 212 525.062 212.209 525.437 212.581L754.409 439.893C754.787 440.269 755 440.78 755 441.313V584.965C755 585.5 754.786 586.012 754.405 586.388L526.537 811.423C526.163 811.793 525.658 812 525.132 812L272.004 812C270.222 812 269.33 809.845 270.59 808.585L567.477 511.771C568.261 510.987 568.258 509.714 567.469 508.934Z" />
            <path d="M275.072 600.794V424C275.072 422.895 275.967 422 277.072 422H344.598C345.093 422 345.57 422.184 345.938 422.515L443.501 510.571C444.378 511.364 444.381 512.74 443.506 513.536L345.939 602.273C345.571 602.608 345.091 602.794 344.594 602.794H277.072C275.967 602.794 275.072 601.898 275.072 600.794Z" />
          </Mark>
        </Icon>
        <Wordmark>Exre Service</Wordmark>
      </Logo>
      {children}
    </Container>
  );
}

const Container = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
  padding: 1rem;
  padding-top: ${Desktop.hasInsetTitlebar() ? "calc(1rem + 40px)" : "1rem"};
  ${draggableOnDesktop()}
`;

const Logo = styled.a`
  display: inline-flex;
  align-items: center;
  flex: 1;
  min-width: 0;
  gap: 0.375rem;
  font-size: 1.25rem;
  font-weight: ${(props) => props.theme.exui.typography.fontWeightBold};
  letter-spacing: -0.01em;
  color: ${s("text")};
  text-decoration: none;
  ${undraggableOnDesktop()}

  &:focus-visible {
    outline: none;
    border-radius: ${(props) => props.theme.exui.radii.small};
    box-shadow: ${exuiTokens.shadows.focus};
  }
`;

const Icon = styled.span`
  display: inline-grid;
  place-items: center;
  flex-shrink: 0;
  width: 2rem;
  height: 2rem;
  border-radius: 28%;
  box-shadow: ${exuiTokens.shadows.medium};
  ${glassSurface}
`;

const Mark = styled.svg`
  width: 85%;
  height: 85%;
  fill: currentColor;
`;

const Wordmark = styled.span`
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
`;
