import { observer } from "mobx-react";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useHistory } from "react-router-dom";
import { EmojiText } from "@shared/components/EmojiText";
import { HeadingPrefixHelper } from "@shared/editor/extensions/HeadingPrefix";
import { DocumentPreference, HeadingPrefixStyle } from "@shared/types";
import { supportsPassiveListener } from "@shared/utils/browser";
import { useDocumentContext } from "~/components/DocumentContext";
import useWindowScrollPosition from "~/hooks/useWindowScrollPosition";
import { patchLocation } from "~/utils/history";
import { decodeURIComponentSafe } from "~/utils/urls";
import { ReadingContentsView } from "./DocumentReadingFrame";

const HEADING_OFFSET = 20;

/** Headings deeper than this level are not listed in the contents. */
const MAX_HEADING_LEVEL = 4;

function Contents() {
  const history = useHistory();
  const [scrolledSlug, setScrolledSlug] = useState<string>();
  const [selectedSlug, setSelectedSlug] = useState<string>();
  const scrollPosition = useWindowScrollPosition({
    throttle: 100,
  });
  const documentContext = useDocumentContext();
  // Headings inside tables carry no number and are not listed.
  const headings = useMemo(
    () => documentContext.headings.filter((heading) => !heading.inTable),
    [documentContext.headings]
  );
  const itemRefs = useRef<Record<string, HTMLLIElement | null>>({});

  const headingPrefix =
    documentContext.document?.getPreference(DocumentPreference.HeadingPrefix) ??
    HeadingPrefixStyle.None;

  // Prefix labels are computed over every heading so that they match the
  // numbering shown in the document, and attached before the deeper headings
  // are dropped. Those headings are not listed, so they also take no part in
  // tracking the active one — a reader inside a deep section keeps the nearest
  // listed heading highlighted rather than losing the highlight entirely.
  const items = useMemo(() => {
    const labels =
      headingPrefix === HeadingPrefixStyle.None
        ? undefined
        : HeadingPrefixHelper.labels(
            headings.map((heading) => heading.level),
            headingPrefix,
            { indented: true }
          );

    return headings
      .map((heading, index) => ({ heading, label: labels?.[index] }))
      .filter(({ heading }) => heading.level <= MAX_HEADING_LEVEL);
  }, [headings, headingPrefix]);

  // A heading chosen from the contents stays highlighted until the reader
  // scrolls themselves. Headings near the end of a document cannot reach the
  // top of the viewport, so the scroll position alone would never select them.
  const activeSlug =
    selectedSlug && items.some(({ heading }) => heading.id === selectedSlug)
      ? selectedSlug
      : scrolledSlug;

  const handleNavigate = useCallback(
    (id: string) => {
      // Navigate via history so the location state (active sidebar context) is
      // retained rather than dropped by a native hash navigation.
      setSelectedSlug(id);
      history.push(patchLocation(history.location, { hash: `#${id}` }));

      // Scroll from here rather than relying on the hash changing, so that
      // clicking the same heading again still moves the reader to it.
      void documentContext.editor?.scrollToAnchor(`#${id}`);
    },
    [history, documentContext]
  );

  useEffect(() => {
    if (!selectedSlug) {
      return;
    }

    // Navigating to the heading scrolls the document during the same commit,
    // so the position here is the one it came to rest at. Any movement away
    // from it is the reader scrolling, whichever means they use.
    const restingPosition = window.pageYOffset;

    const handleScroll = () => {
      if (window.pageYOffset !== restingPosition) {
        setSelectedSlug(undefined);
      }
    };

    window.addEventListener(
      "scroll",
      handleScroll,
      supportsPassiveListener ? { passive: true } : false
    );

    return () => window.removeEventListener("scroll", handleScroll);
  }, [selectedSlug]);

  useEffect(() => {
    let activeId = items.length > 0 ? items[0].heading.id : undefined;

    for (const { heading } of items) {
      const element = window.document.getElementById(
        decodeURIComponentSafe(heading.id)
      );

      if (element) {
        const bounding = element.getBoundingClientRect();
        if (bounding.top > HEADING_OFFSET) {
          break;
        }
        activeId = heading.id;
      }
    }

    if (scrolledSlug !== activeId) {
      setScrolledSlug(activeId);
    }
  }, [scrollPosition, items, scrolledSlug]);

  useEffect(() => {
    const activeItem = activeSlug ? itemRefs.current[activeSlug] : undefined;

    if (activeItem) {
      activeItem.scrollIntoView({
        block: "nearest",
      });
    }
  }, [activeSlug]);

  const { t } = useTranslation();
  return (
    <ReadingContentsView
      headings={items.map(({ heading, label }) => ({
        id: heading.id,
        level: heading.level,
        title: heading.title,
        label,
      }))}
      activeHeading={activeSlug}
      navigateHeading={handleNavigate}
      onItemRef={(id, element) => {
        itemRefs.current[id] = element;
      }}
      headingTitle={(heading) => <EmojiText>{heading.title}</EmojiText>}
      title={t("Contents")}
    />
  );
}

export default observer(Contents);
