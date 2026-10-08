import { useCallback, useEffect, useRef, useState } from "react";
import { observer } from "mobx-react";
import { useHistory, useLocation, useParams, Link } from "react-router-dom";
import type { PublicDocumentInfo } from "@shared/types/websiteIntegration";
import { HeadingPrefixStyle } from "@shared/types";
import { publicBasePath, publicUrl } from "@shared/utils/publicPath";
import Editor from "~/components/Editor";
import Header from "~/components/Header";
import Flex from "~/components/Flex";
import { useTranslation } from "react-i18next";
import type { Editor as EditorInstance } from "~/editor";
import env from "~/env";
import useStores from "~/hooks/useStores";
import {
  DocumentReadingFrame,
  type ReadingHeading,
} from "~/scenes/Document/components/DocumentReadingFrame";
import { PublicComments } from "./PublicComments";
import { PublicFeedback } from "./PublicFeedback";

/** Resolves a fresh public document and never mounts a member document model. */
export const PublicDocumentView = observer(function PublicDocumentView({
  allowComments = false,
  showHeader = false,
}: {
  allowComments?: boolean;
  showHeader?: boolean;
}) {
  const { publicDocs, auth } = useStores();
  const { documentSlug } = useParams<{ documentSlug: string }>();
  const generation = publicDocs.generation;
  const { t } = useTranslation();
  const header = showHeader && (
    <Header
      hasSidebar
      title={publicDocs.document.data?.title ?? t("Documents")}
    />
  );
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
        {header}
        <PublicFeedback
          state={
            publicDocs.documentKey === documentSlug ? state.status : "loading"
          }
          reason={state.reason}
          retry={() => {
            void publicDocs.loadDocument(documentSlug);
          }}
        />
      </Flex>
    );
  }
  return (
    <Flex column auto>
      {header}
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

function PublicDocumentReader({
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
  const editor = useRef<EditorInstance | null>(null);
  const [headings, setHeadings] = useState<ReadingHeading[]>([]);
  const [showContents, setShowContents] = useState(true);
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
  return (
    <DocumentReadingFrame
      title={info.title}
      breadcrumb={publicDocs.collections.data
        ?.filter((collection) => collection.id === info.collectionId)
        .map((collection) => (
          <Link key={collection.id} to={collection.url}>
            {collection.name}
          </Link>
        ))}
      headings={headings}
      showContents={showContents}
      onToggleContents={() => setShowContents((visible) => !visible)}
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
  );
}
