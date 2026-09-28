import * as React from "react";
import styled from "styled-components";
import Flex from "./Flex";
import Text from "./Text";

type Props = {
  children?: React.ReactNode;
  icon?: JSX.Element;
  description?: JSX.Element;
  className?: string;
};

const Notice: React.FC<Props> = ({
  children,
  icon,
  description,
  className,
}: Props) => (
  <Container as="div" className={className}>
    <Flex as="span" gap={8}>
      {icon}
      <span>
        <Title>{children}</Title>
        {description && (
          <>
            <br />
            {description}
          </>
        )}
      </span>
    </Flex>
  </Container>
);

const Title = styled.span`
  font-weight: ${(props) => props.theme.exui.typography.fontWeightMedium};
  font-size: ${(props) => props.theme.exui.typography.bodyFontSize};
`;

const Container = styled(Text)`
  background: ${(props) => props.theme.exui.surface.surfaceSecondary};
  color: ${(props) => props.theme.exui.surface.foreground};
  padding: 0.625rem 0.75rem;
  border-radius: ${(props) => props.theme.exui.radii.extraLarge};
  position: relative;
  font-size: ${(props) => props.theme.exui.typography.bodyFontSize};
  line-height: ${(props) => props.theme.exui.typography.bodyLineHeight};
  margin: 1em 0;

  svg {
    flex-shrink: 0;
  }
`;

export default Notice;
