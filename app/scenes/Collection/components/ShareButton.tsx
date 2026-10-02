import { ShareIcon as Share } from "@shared/components/LucideIcon";
import { observer } from "mobx-react";
import { Suspense, useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import type Collection from "~/models/Collection";
import Button from "~/components/Button";
import Tooltip from "~/components/Tooltip";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "~/components/primitives/Popover";
import useMobile from "~/hooks/useMobile";
import useShareDataLoader from "~/hooks/useShareDataLoader";
import { preventDefault } from "~/utils/events";
import lazyWithRetry from "~/utils/lazyWithRetry";

const SharePopover = lazyWithRetry(
  () => import("~/components/Sharing/Collection/SharePopover")
);

type Props = {
  /** Collection being shared */
  collection: Collection;
};

function ShareButton({ collection }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const isMobile = useMobile();
  const { preload, loading, reset } = useShareDataLoader({ collection });

  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      setOpen(isOpen);
      if (isOpen) {
        preload();
      } else {
        reset();
      }
    },
    [preload, reset]
  );

  const closePopover = useCallback(() => {
    handleOpenChange(false);
  }, [handleOpenChange]);

  if (isMobile) {
    return null;
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <Tooltip content={t("Share")} side="bottom">
        <PopoverTrigger>
          <Button
            icon={<Share aria-hidden />}
            aria-label={t("Share")}
            neutral
            borderOnHover
            onMouseEnter={preload}
          />
        </PopoverTrigger>
      </Tooltip>
      <PopoverContent
        aria-label={t("Share")}
        width={400}
        minHeight={175}
        side="bottom"
        align="end"
        onEscapeKeyDown={preventDefault}
      >
        <Suspense fallback={null}>
          <SharePopover
            collection={collection}
            onRequestClose={closePopover}
            visible={open}
            loading={loading}
          />
        </Suspense>
      </PopoverContent>
    </Popover>
  );
}

export default observer(ShareButton);
