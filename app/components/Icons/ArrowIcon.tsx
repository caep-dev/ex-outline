/**
 *
 * OUTLINE ICON BLOCK
 *
 * import { ArrowIcon as ArrowRightIcon } from "outline-icons";
 */
import { ArrowIcon as ArrowRightIcon } from "@shared/components/LucideIcon";
import styled from "styled-components";

/**
 *
 * OUTLINE ICON BLOCK
 *
 * export { ArrowIcon as ArrowRightIcon } from "outline-icons";
 */
export { ArrowIcon as ArrowRightIcon } from "@shared/components/LucideIcon";

export const ArrowUpIcon = styled(ArrowRightIcon)`
  transform: rotate(-90deg);
`;

export const ArrowDownIcon = styled(ArrowRightIcon)`
  transform: rotate(90deg);
`;

export const ArrowLeftIcon = styled(ArrowRightIcon)`
  transform: rotate(180deg);
`;
