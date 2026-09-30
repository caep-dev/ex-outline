import { t } from "i18next";
/**
 *
 * OUTLINE ICON BLOCK
 *
 * import { CommentIcon } from "outline-icons";
 */
import { CommentIcon } from "@shared/components/LucideIcon";
import { isMarkActive } from "@shared/editor/queries/isMarkActive";
import type { MenuItem, SelectionContext } from "@shared/editor/types";

/**
 * Returns menu items for the read-only selection toolbar.
 *
 * @param ctx - the current selection context.
 * @param canComment - whether the user has permission to comment on the document.
 * @returns an array of menu items.
 */
export default function readOnlyMenuItems(
  ctx: SelectionContext,
  canComment: boolean
): MenuItem[] {
  const { schema } = ctx;

  return [
    {
      visible: canComment && !ctx.isEmpty,
      name: "comment",
      tooltip: t("Comment"),
      label: t("Comment"),
      icon: <CommentIcon />,
      active: isMarkActive(schema.marks.comment),
    },
  ];
}
