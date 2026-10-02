/**
 *
 * OUTLINE ICON BLOCK
 *
 * import { SearchIcon } from "outline-icons";
 */
import { SearchIcon } from "@shared/components/LucideIcon";
import * as React from "react";
import styled, { useTheme } from "styled-components";
import { s } from "@shared/styles";
import Flex from "~/components/Flex";

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

const StyledInput = styled.input`
  width: 100%;
  height: ${(props) => props.theme.exui.components.formControl.base.height};
  box-sizing: border-box;
  padding-block: 6px;
  padding-inline: 40px 12px;
  font-size: 1rem;
  line-height: 24px;
  font-weight: ${(props) => props.theme.exui.typography.fontWeightRegular};
  outline: none;
  border: 0;
  background: ${s("inputBackground")};
  border-radius: 9999px;
  color: ${s("text")};

  &:focus-visible {
    box-shadow: ${(props) =>
      props.theme.exui.components.formControl.focus.shadow};
  }

  ::-webkit-search-cancel-button {
    -webkit-appearance: none;
  }
  &::placeholder {
    color: ${(props) =>
      props.theme.exui.components.formControl.base.placeholder};
    opacity: 1;
  }
`;

const StyledIcon = styled(SearchIcon)`
  position: absolute;
  inset-inline-start: 12px;
`;

export default React.forwardRef(SearchInput);
