import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import styled from "styled-components";
import { s, ellipsis, hover } from "@shared/styles";
import type { ConfigItem } from "~/hooks/useSettingsConfig";
import Button from "../../../components/Button";
import Text from "../../../components/Text";
import { VStack } from "~/components/primitives/VStack";
import { Status } from "./Status";
import Flex from "@shared/components/Flex";

type Props = {
  integration: ConfigItem;
  isConnected?: boolean;
};

function IntegrationCard({ integration, isConnected }: Props) {
  const { t } = useTranslation();

  return (
    <Card as={Link} to={integration.path}>
      <Flex justify="space-between" align="flex-start">
        <VStack align="flex-start">
          <integration.icon size={32} monochrome={false} />
          <VStack spacing={2} align="flex-start">
            <Name>{integration.name}</Name>
            {isConnected && <Status>{t("Connected")}</Status>}
          </VStack>
        </VStack>
        <Button as="span" neutral>
          {t("Configure")}
        </Button>
      </Flex>

      <Description>{integration.description}</Description>
    </Card>
  );
}

export default IntegrationCard;

export const Card = styled.div`
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  padding: 1.5rem;
  width: 18.75rem;
  background: ${(props) => props.theme.exui.tokens.surface.card};
  border: 1px solid ${(props) => props.theme.exui.surface.border};
  color: ${(props) => props.theme.exui.tokens.surface.cardForeground};
  border-radius: 2rem;
  box-shadow: ${(props) => props.theme.exui.shadow.medium};
  transition: box-shadow 200ms ease;
  cursor: var(--pointer);

  &: ${hover} {
    box-shadow: ${(props) => props.theme.exui.shadow.large};
  }
`;

const Name = styled(Text)`
  margin: 0 0 -4px;
  font-size: 1rem;
  font-weight: ${(props) => props.theme.exui.typography.fontWeightMedium};
  color: ${s("text")};
  ${ellipsis()}
`;

const Description = styled(Text)`
  margin: 12px 0 0;
  font-size: ${(props) => props.theme.exui.typography.bodyFontSize};
  max-width: 100%;
  color: ${s("textTertiary")};
`;
