/**
 *
 * OUTLINE ICON BLOCK
 *
 * import { SearchIcon } from "outline-icons";
 */
import { SearchIcon } from "@shared/components/LucideIcon";
import * as React from "react";
import styled, { useTheme } from "styled-components";
import Flex from "~/components/Flex";
import { DocsSearchField } from "~/components/DocsSearch";

interface Props extends React.HTMLAttributes<HTMLInputElement> {
  name: string;
  defaultValue: string;
}

function SearchInput(
  { defaultValue, ...rest }: Props,
  ref: React.RefObject<HTMLInputElement>
) {
  const theme = useTheme();
  const focusInput = React.useCallback(() => {
    ref.current?.focus();
  }, [ref]);

  React.useEffect(() => {
    // ensure that focus is placed at end of input
    const len = (defaultValue || "").length;
    ref.current?.setSelectionRange(len, len);
    const timeoutId = setTimeout(() => {
      focusInput();
    }, 100); // arbitrary number

    return () => {
      clearTimeout(timeoutId);
    };
  }, [ref, defaultValue, focusInput]);

  return (
    <Wrapper align="center">
      <StyledIcon color={theme.placeholder} onClick={focusInput} />
      <StyledInput
        {...rest}
        defaultValue={defaultValue}
        ref={ref}
        spellCheck="false"
        type="search"
        autoFocus
      />
    </Wrapper>
  );
}

const Wrapper = styled(Flex)`
  position: relative;
  margin-bottom: 8px;
`;

const StyledInput = styled(DocsSearchField)`
  ::-webkit-search-cancel-button {
    -webkit-appearance: none;
  }
`;

const StyledIcon = styled(SearchIcon)`
  position: absolute;
  inset-inline-start: 12px;
`;

export default React.forwardRef(SearchInput);
