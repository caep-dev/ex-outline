import { useTranslation } from "react-i18next";
import styled from "styled-components";
import Spinner from "@shared/components/Spinner";
import Flex from "~/components/Flex";

interface Props {
  /** Uses less space when loading another page of existing results. */
  compact?: boolean;
}

/**
 * Shows an accessible loading indicator in the search results area.
 *
 * @param props the loading indicator layout.
 * @returns the centered loading icon.
 */
export function SearchLoading({ compact = false }: Props) {
  const { t } = useTranslation();
  return (
    <Container
      $compact={compact}
      align="center"
      justify="center"
      role="status"
      aria-label={t("Loading")}
    >
      <Spinner aria-hidden style={{ width: 24, height: 24 }} />
    </Container>
  );
}

const Container = styled(Flex)<{ $compact: boolean }>`
  width: 100%;
  min-height: ${(props) => (props.$compact ? "56px" : "180px")};
`;
