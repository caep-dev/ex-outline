import { SearchIcon } from "@shared/components/LucideIcon";
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import Button from "~/components/Button";
import Modal from "~/components/Modal";
import { SearchLoading } from "~/scenes/Search/components/SearchLoading";
import useKeyDown from "~/hooks/useKeyDown";

interface Props {
  /** The initial collection scope; omitted to search all collections. */
  collectionId?: string;
}

/**
 * Opens the shared search interface in a modal with an optional collection scope.
 *
 * @param props the initial collection scope.
 * @returns the search button and its modal.
 */
export function SearchButton({ collectionId }: Props) {
  const { t } = useTranslation();
  const label = collectionId
    ? t("Search in collection")
    : t("Search documents");
  const { pathname } = useLocation();
  const [isOpen, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const handleOpen = useCallback(() => setOpen(true), []);
  const handleClose = useCallback(() => setOpen(false), []);

  useEffect(() => {
    setOpen(false);
  }, [pathname, collectionId]);

  useKeyDown(
    "f",
    (event) => {
      event.preventDefault();
      handleOpen();
    },
    { metaKey: true }
  );

  return (
    <>
      <Button
        ref={triggerRef}
        icon={<SearchIcon />}
        neutral
        onClick={handleOpen}
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        {t("Search")}
      </Button>
      <Modal
        isOpen={isOpen}
        title={label}
        onRequestClose={handleClose}
        centered
        fixedSize
        width={640}
        height={560}
        contentGap={8}
        // Extend the scroll viewport around focus rings without moving its content.
        style={{ padding: 4, margin: -4 }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          triggerRef.current?.focus();
        }}
      >
        {isOpen && (
          <Suspense fallback={<SearchLoading />}>
            <SearchContent
              embedded
              initialCollectionId={collectionId}
              onRequestClose={handleClose}
            />
          </Suspense>
        )}
      </Modal>
    </>
  );
}

const SearchContent = lazy(() =>
  import("~/scenes/Search/Search").then((module) => ({
    default: module.SearchContent,
  }))
);
