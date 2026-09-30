/**
 *
 * OUTLINE ICON BLOCK
 *
 * import { SearchIcon } from "outline-icons";
 */
import { SearchIcon } from "@shared/components/LucideIcon";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "styled-components";
import type { Props as InputProps } from "~/components/Input";
import Input from "~/components/Input";

type Props = InputProps & {
  placeholder?: string;
  value?: string;
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => unknown;
  onFocus?: (event: React.FocusEvent<HTMLInputElement>) => unknown;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => unknown;
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => unknown;
};

function InputSearch(
  props: Props,
  ref: React.RefObject<HTMLInputElement | HTMLTextAreaElement>
) {
  const { t } = useTranslation();
  const theme = useTheme();
  const {
    placeholder = `${t("Search")}…`,
    onKeyDown,
    onBlur,
    onFocus,
    ...rest
  } = props;

  return (
    <Input
      type="search"
      placeholder={placeholder}
      icon={
        <SearchIcon
          color={theme.exui.components.formControl.base.placeholder}
        />
      }
      onKeyDown={onKeyDown}
      onFocus={onFocus}
      onBlur={onBlur}
      margin={0}
      labelHidden
      ref={ref}
      {...rest}
      round
    />
  );
}

export default React.forwardRef(InputSearch);
