import * as React from "react";
import Layout from "~/components/Layout";
import { RightSidebarProvider } from "~/components/RightSidebarContext";
import { PortalContext } from "~/components/Portal";
import { DocumentContextProvider } from "~/components/DocumentContext";
import { DocsNavigationFocus } from "~/components/DocsNavigationFocus";

interface DocsLayoutProps {
  title?: string;
  sidebar?: React.ReactNode;
  sidebarCanCollapse?: boolean;
  documentContext?: boolean;
  children?: React.ReactNode;
}

/**
 * Renders the shared document shell without requiring an identity.
 *
 * @param props the document layout slots and optional document context.
 * @returns the shared document layout.
 */
export function DocsLayout({
  title,
  sidebar,
  sidebarCanCollapse = true,
  documentContext = false,
  children,
}: DocsLayoutProps) {
  const layoutRef = React.useRef<HTMLDivElement>(null);
  const content = (
    <RightSidebarProvider>
      <PortalContext.Provider value={layoutRef.current}>
        <Layout
          title={title}
          sidebar={sidebar}
          sidebarCanCollapse={sidebarCanCollapse}
          ref={layoutRef}
        >
          {children}
          <DocsNavigationFocus layoutRef={layoutRef} />
        </Layout>
      </PortalContext.Provider>
    </RightSidebarProvider>
  );

  return documentContext ? (
    <DocumentContextProvider>{content}</DocumentContextProvider>
  ) : (
    content
  );
}
