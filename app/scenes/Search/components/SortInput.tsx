import type { DirectionFilter, SortFilter as TSortFilter } from "@shared/types";
/**
 *
 * OUTLINE ICON BLOCK
 *
 * import { SortAscendingIcon, SortDescendingIcon } from "outline-icons";
 */
import {
  SortAscendingIcon,
  SortDescendingIcon,
} from "@shared/components/LucideIcon";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import FilterOptions from "~/components/FilterOptions";

type Props = {
  /** The selected sort field */
  sort?: TSortFilter | null;
  /** The selected sort direction */
  direction?: DirectionFilter | null;
  /** Callback when a sort option is selected */
  onSelect: (sort: string, direction: string) => void;
};

export const SortInput = ({ sort, direction, onSelect }: Props) => {
  const { t } = useTranslation();
  const options = useMemo(
    () => [
      {
        key: "relevance-DESC",
        label: t("Relevance"),
        icon: <SortDescendingIcon />,
      },
      {
        key: "updatedAt-DESC",
        label: t("Recently updated"),
        icon: <SortDescendingIcon />,
      },
      {
        key: "updatedAt-ASC",
        label: t("Least recently updated"),
        icon: <SortAscendingIcon />,
      },
      {
        key: "createdAt-DESC",
        label: t("Newest"),
        icon: <SortDescendingIcon />,
      },
      {
        key: "createdAt-ASC",
        label: t("Oldest"),
        icon: <SortAscendingIcon />,
      },
      {
        key: "title-ASC",
        label: t("A → Z"),
        icon: <SortAscendingIcon />,
      },
      {
        key: "title-DESC",
        label: t("Z → A"),
        icon: <SortDescendingIcon />,
      },
    ],
    [t]
  );

  const selectedKey =
    sort && direction ? `${sort}-${direction}` : "relevance-DESC";

  const handleSelect = (key: string) => {
    const [sortField, sortDirection] = key.split("-");
    onSelect(sortField, sortDirection);
  };

  return (
    <FilterOptions
      showFilter={false}
      showIcons={false}
      disclosure={false}
      options={options}
      selectedKeys={[selectedKey]}
      onSelect={handleSelect}
      defaultLabel={t("Relevance")}
    />
  );
};
