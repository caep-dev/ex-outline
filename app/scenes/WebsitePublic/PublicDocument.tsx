import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { observer } from "mobx-react";
import { useHistory, useLocation, useParams } from "react-router-dom";
import styled, { createGlobalStyle } from "styled-components";
import { MenuIcon, CloseIcon } from "@shared/components/LucideIcon";
import type { PublicDocumentInfo } from "@shared/types/websiteIntegration";
import { EditorStyleHelper } from "@shared/editor/styles/EditorStyleHelper";
import { HeadingPrefixStyle } from "@shared/types";
import { publicBasePath, publicUrl } from "@shared/utils/publicPath";
import Editor from "~/components/Editor";
import Header from "~/components/Header";
import Flex from "~/components/Flex";
import Button from "~/components/Button";
import PageTitle from "~/components/PageTitle";
import Text from "~/components/Text";
import Time from "~/components/Time";
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerTitle,
  DrawerHandle,
} from "~/components/primitives/Drawer";
import { useTranslation } from "react-i18next";
import type { Editor as EditorInstance } from "~/editor";
import env from "~/env";
import useStores from "~/hooks/useStores";
import useMobile from "~/hooks/useMobile";
import {
  DocumentReadingFrame,
  ReadingContentsView,
  type ReadingHeading,
} from "~/scenes/Document/components/DocumentReadingFrame";
import { PublicComments } from "./PublicComments";
import { PublicFeedback } from "./PublicFeedback";
import { PublicReadingNavigation } from "./PublicReadingNavigation";

/** Resolves a fresh public document and never mounts a member document model. */
export const PublicDocumentView = observer(function PublicDocumentView({
  allowComments = false,
}: {
  allowComments?: boolean;
}) {
  const { publicDocs, auth } = useStores();
  const { documentSlug } = useParams<{ documentSlug: string }>();
  const generation = publicDocs.generation;
  const { t } = useTranslation();
  useEffect(() => {
    void publicDocs.loadDocument(documentSlug);
    return () => publicDocs.leaveRoute();
  }, [publicDocs, documentSlug, generation]);
  const state = publicDocs.document;
  if (
    publicDocs.documentKey !== documentSlug ||
    state.status !== "ready" ||
    !state.data
  ) {
    return (
      <Flex column auto>
        <PageTitle title={t("Documents")} />
        <Header
          hasSidebar
          title={t("Documents")}
          left={<PublicReadingNavigation />}
        />
        <PublicFeedback
          layout="page"
          state={
            publicDocs.documentKey === documentSlug ? state.status : "loading"
          }
          reason={
            publicDocs.documentKey === documentSlug ? state.reason : undefined
          }
          retry={() => {
            void publicDocs.loadDocument(documentSlug);
          }}
        />
      </Flex>
    );
  }
  return (
    <Flex column auto>
      <PublicDocumentReader
        key={`${generation}:${state.data.id}`}
        info={state.data}
        allowComments={
          allowComments &&
          auth.authenticated &&
          !auth.integrationAuthUnavailable
        }
        onRevoked={() => {
          void publicDocs.loadDocument(documentSlug, true);
        }}
      />
    </Flex>
  );
});

const PublicDocumentReader = observer(function PublicDocumentReader({
  info,
  allowComments,
  onRevoked,
}: {
  info: PublicDocumentInfo;
  allowComments: boolean;
  onRevoked: () => void;
}) {
  const { publicDocs } = useStores();
  const history = useHistory();
  const location = useLocation();
  const { t } = useTranslation();
  const isMobile = useMobile();
  const surface = useRef<HTMLDivElement>(null);
  const [hasContentsSpace, setHasContentsSpace] = useState(true);
  const useContentsDrawer = isMobile || !hasContentsSpace;
  const editor = useRef<EditorInstance | null>(null);
  const [headings, setHeadings] = useState<ReadingHeading[]>([]);
  const [showContents, setShowContents] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const contentsAvailable = headings.some((heading) => heading.level <= 4);
  useLayoutEffect(() => {
    const grid = surface.current?.querySelector<HTMLElement>(
      "[data-public-reading-grid]"
    );
    if (!grid || isMobile) {
      return undefined;
    }
    const measure = () => {
      // Read the shared grid rather than duplicating its em-based reading width
      // or assuming that a desktop viewport always leaves a usable TOC gutter.
      const columns = getComputedStyle(grid).gridTemplateColumns.split(" ");
      const gutter = columns.length === 3 ? Number.parseFloat(columns[2]) : NaN;
      if (Number.isFinite(gutter)) {
        setHasContentsSpace(gutter >= EditorStyleHelper.tocWidth);
      }
    };
    measure();
    const resize = new ResizeObserver(measure);
    resize.observe(grid);
    return () => resize.disconnect();
  }, [isMobile]);
  useEffect(() => {
    if (!useContentsDrawer || !contentsAvailable) {
      setDrawerOpen(false);
    }
  }, [useContentsDrawer, contentsAvailable]);
  useEffect(() => {
    const handlePrint = () => setDrawerOpen(false);
    window.addEventListener("beforeprint", handlePrint);
    return () => window.removeEventListener("beforeprint", handlePrint);
  }, []);
  const handleInit = useCallback(() => {
    const next: ReadingHeading[] =
      editor.current?.getHeadings().filter((heading) => !heading.inTable) ?? [];
    // The wrapper merges refs on each render; attaching an unchanged reader must
    // not produce a parent update and another ref attachment.
    setHeadings((previous) =>
      previous.length === next.length &&
      previous.every((heading, index) => {
        const other = next[index];
        return (
          heading.id === other.id &&
          heading.level === other.level &&
          heading.title === other.title &&
          heading.label === other.label
        );
      })
        ? previous
        : next
    );
  }, []);
  const attachEditor = useCallback(
    (instance: EditorInstance | null) => {
      editor.current = instance;
      if (instance) {
        handleInit();
      }
    },
    [handleInit]
  );
  const handleNavigateHeading = useCallback(
    (id: string) => {
      history.push({ ...history.location, hash: `#${id}` });
      void editor.current?.scrollToAnchor(`#${id}`);
      setDrawerOpen(false);
    },
    [history]
  );
  const handleClickLink = useCallback(
    (href: string, event?: MouseEvent) => {
      if (href.startsWith("#")) {
        handleNavigateHeading(href.slice(1));
        return;
      }
      const url = new URL(
        href.startsWith("/") && !href.startsWith("//")
          ? publicUrl(env.URL, href)
          : href,
        env.URL
      );
      const base = publicBasePath(env.URL);
      const path =
        base && url.pathname.startsWith(`${base}/`)
          ? url.pathname.slice(base.length)
          : url.pathname;
      if (
        url.origin === new URL(env.URL).origin &&
        path.startsWith("/doc/") &&
        (!event ||
          (!event.metaKey &&
            !event.ctrlKey &&
            !event.shiftKey &&
            !event.altKey &&
            event.button === 0))
      ) {
        history.push(path + url.search + url.hash);
      } else {
        window.open(url.toString(), "_blank", "noopener,noreferrer");
      }
    },
    [history, handleNavigateHeading]
  );
  const collection = publicDocs.collections.data?.find(
    (item) => item.id === info.collectionId
  );
  const contentsButton = contentsAvailable && (
    <Button
      neutral
      borderOnHover
      icon={<MenuIcon aria-hidden />}
      aria-label={t("Contents")}
      aria-expanded={useContentsDrawer ? drawerOpen : showContents}
      aria-controls={
        useContentsDrawer ? "public-mobile-contents" : "docs-reading-contents"
      }
      onClick={
        useContentsDrawer
          ? undefined
          : () => setShowContents((visible) => !visible)
      }
    />
  );
  return (
    <Flex column auto ref={surface}>
      <PublicReaderPrintStyles />
      <Drawer
        open={useContentsDrawer && drawerOpen}
        onOpenChange={setDrawerOpen}
      >
        <PageTitle title={info.title} />
        <Header
          hasSidebar
          title={info.title}
          left={
            <PublicReadingNavigation collection={collection}>
              {useContentsDrawer && contentsAvailable ? (
                <DrawerTrigger asChild>{contentsButton}</DrawerTrigger>
              ) : (
                contentsButton
              )}
            </PublicReadingNavigation>
          }
        />
        <DocumentReadingFrame
          title={info.title}
          metadata={
            Number.isFinite(Date.parse(info.updatedAt)) ? (
              <Text type="tertiary">
                {t("Last updated")} <Time dateTime={info.updatedAt} addSuffix />
              </Text>
            ) : undefined
          }
          headings={headings}
          showContents={!useContentsDrawer && showContents}
          navigateHeading={handleNavigateHeading}
          editor={
            <>
              <Editor
                ref={attachEditor}
                id={info.id}
                publicReader
                readOnly
                value={info.content}
                defaultValue={info.content}
                headingPrefix={HeadingPrefixStyle.None}
                scrollTo={location.hash}
                onInit={handleInit}
                onClickLink={handleClickLink}
              />
              {allowComments && (
                <PublicComments documentId={info.id} onRevoked={onRevoked} />
              )}
            </>
          }
        />
        {useContentsDrawer && contentsAvailable && (
          <DrawerContent
            id="public-mobile-contents"
            aria-describedby={undefined}
          >
            <DrawerHandle />
            <DrawerTitle hidden>{t("Contents")}</DrawerTitle>
            <Text
              weight="bold"
              style={{ textAlign: "center", padding: "8px 0" }}
            >
              {t("Contents")}
            </Text>
            <Button
              neutral
              borderOnHover
              icon={<CloseIcon aria-hidden />}
              aria-label={t("Close")}
              onClick={() => setDrawerOpen(false)}
            />
            <MobileContents>
              <ReadingContentsView
                headings={headings}
                navigateHeading={handleNavigateHeading}
                title={t("Contents")}
                mobileVisible
              />
            </MobileContents>
          </DrawerContent>
        )}
      </Drawer>
    </Flex>
  );
});

const MobileContents = styled.div`
  min-height: 0;
  overflow-y: auto;
  max-height: 65vh;
  padding: 0 16px 16px;
  @media print {
    display: none;
  }
`;

// The shared primitive portals the surface and overlay outside this reader.
// Scope print suppression to this reader's drawer, including its close animation.
const PublicReaderPrintStyles = createGlobalStyle`
  @media print {
    [data-vaul-drawer]:has(#public-mobile-contents),
    [data-vaul-overlay]:has(~ [data-vaul-drawer] #public-mobile-contents) {
      display: none !important;
    }
  }
`;
