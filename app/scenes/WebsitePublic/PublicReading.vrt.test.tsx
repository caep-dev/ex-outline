import { Suspense } from "react";
import { Observer, Provider } from "mobx-react";
import { render, unmountComponentAtNode } from "react-dom";
import { act } from "react-dom/test-utils";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter, Route } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import { page } from "vitest/browser";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import GlobalStyles from "@shared/styles/globals";
import { buildLightTheme, buildDarkTheme } from "@shared/styles/theme";
import { breakpoints } from "@shared/styles";
import { DocsLayout } from "~/components/DocsLayout";
import Sidebar from "~/components/Sidebar/Sidebar";
import { DocsNavigation } from "~/components/Sidebar/DocsNavigation";
import RootStore from "~/stores/RootStore";
import { client } from "~/utils/ApiClient";
import { PublicDocumentView } from "./PublicDocument";
import { PublicDirectory } from "./PublicDirectory";

vi.mock("~/utils/ApiClient", () => ({
  client: {
    fetch: vi.fn(),
    post: vi.fn().mockResolvedValue({
      data: { user: {}, team: {}, groups: [], groupUsers: [] },
    }),
    setUnauthorizedHandler: vi.fn(),
  },
}));

const collection = {
  id: "collection-1",
  name: "A long public collection title for responsive navigation 布局检查",
  description:
    "**Public description** with a [safe link](https://example.test).",
  url: "/public/collection/collection-1",
};
const info = {
  id: "doc-3",
  collectionId: collection.id,
  title: "Public reading layout 公共阅读界面",
  url: "/doc/guide-1234567890",
  updatedAt: "2026-10-08T00:00:00Z",
  content: {
    type: "doc",
    content: [
      {
        type: "heading",
        attrs: { level: 2 },
        content: [{ type: "text", text: "Overview" }],
      },
      {
        type: "paragraph",
        content: [
          {
            type: "text",
            text: "Published body text for the real read-only editor.",
          },
        ],
      },
      {
        type: "heading",
        attrs: { level: 3 },
        content: [{ type: "text", text: "Details" }],
      },
      {
        type: "paragraph",
        content: [{ type: "text", text: "More public content." }],
      },
    ],
  },
};
let container: HTMLDivElement | undefined;
let rootStore: RootStore;
const initialWidth = window.innerWidth;
const initialHeight = window.innerHeight;

beforeEach(async () => {
  await page.viewport(initialWidth, initialHeight);
  await expect.poll(() => window.innerWidth).toBe(initialWidth);
  rootStore = new RootStore();
  vi.mocked(client.fetch).mockImplementation(async (path) => {
    if (path === "/public.documents.info") {
      return { data: info };
    }
    return {
      data:
        path === "/public.collections.list"
          ? [collection]
          : [
              {
                id: "doc-1",
                title: "Root guide",
                url: "/doc/root-1234567890",
                parentDocumentId: null,
                updatedAt: info.updatedAt,
              },
              {
                id: "doc-2",
                title: "Child guide",
                url: "/doc/child-1234567890",
                parentDocumentId: "doc-1",
                updatedAt: info.updatedAt,
              },
              {
                id: info.id,
                title: info.title,
                url: info.url,
                parentDocumentId: "doc-2",
                updatedAt: info.updatedAt,
              },
            ],
      pagination: { offset: 0, limit: 100, hasMore: false },
    };
  });
});

afterEach(() => {
  if (container) {
    const root = container;
    act(() => {
      unmountComponentAtNode(root);
    });
    root.remove();
    container = undefined;
  }
  vi.clearAllMocks();
});

for (const { name, theme } of [
  { name: "light", theme: buildLightTheme() },
  { name: "dark", theme: buildDarkTheme() },
]) {
  describe(`Public reading composition in ${name}`, () => {
    async function mount(directory = false) {
      await rootStore.publicDocs.loadNextCollections();
      const root = document.createElement("div");
      container = root;
      document.body.append(root);
      act(() => {
        render(
          <Provider rootStore={rootStore}>
            <HelmetProvider>
              <ThemeProvider theme={theme}>
                <GlobalStyles />
                <Suspense fallback={<div>Loading editor</div>}>
                  <MemoryRouter
                    initialEntries={[directory ? collection.url : info.url]}
                  >
                    <DocsLayout
                      sidebar={
                        <Sidebar showAccountMenu={false}>
                          <Observer>
                            {() => (
                              <DocsNavigation
                                homePath="/"
                                searchPath="/search"
                                view={{
                                  ...rootStore.publicDocs.navigation,
                                  expandedIds: new Set(
                                    rootStore.publicDocs.navigation.expandedIds
                                  ),
                                }}
                                onToggle={(id) =>
                                  rootStore.publicDocs.toggle(id)
                                }
                              />
                            )}
                          </Observer>
                        </Sidebar>
                      }
                    >
                      <Route path="/doc/:documentSlug">
                        <PublicDocumentView />
                      </Route>
                      <Route path="/public/collection/:collectionId">
                        <PublicDirectory />
                      </Route>
                    </DocsLayout>
                  </MemoryRouter>
                </Suspense>
              </ThemeProvider>
            </HelmetProvider>
          </Provider>,
          root
        );
      });
      await document.fonts.ready;
    }

    it("keeps the real editor and header inside the viewport, with stable desktop reading position", async () => {
      await mount();
      await expect
        .element(
          page.getByText("Published body text for the real read-only editor.")
        )
        .toBeVisible();
      const title = document.querySelector("article h1");
      const toolbar = document.querySelector("[data-public-reading-toolbar]");
      if (!title || !toolbar) {
        throw new Error("The public reading surface did not render");
      }
      expect(toolbar.closest("article")).toBeNull();
      const before = title.getBoundingClientRect();
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
        window.innerWidth
      );
      expect(toolbar.getBoundingClientRect().right).toBeLessThanOrEqual(
        window.innerWidth
      );
      if (document.getElementById("docs-reading-contents")) {
        await page
          .getByRole("button", { name: "Contents", exact: true })
          .click();
        expect(document.getElementById("docs-reading-contents")).toBeNull();
        expect(title.getBoundingClientRect().x).toBeCloseTo(before.x, 1);
        expect(title.getBoundingClientRect().width).toBeCloseTo(
          before.width,
          1
        );
      } else {
        await page
          .getByRole("button", { name: "Contents", exact: true })
          .click();
        await expect
          .element(page.getByRole("dialog", { name: "Contents", exact: true }))
          .toBeVisible();
        await expect
          .element(
            page.getByRole("navigation", { name: "Contents", exact: true })
          )
          .toBeVisible();
        await page.getByRole("link", { name: "Details", exact: true }).click();
        await expect.element(page.getByRole("dialog")).not.toBeInTheDocument();
        await expect
          .poll(() => document.activeElement?.getAttribute("aria-label"))
          .toBe("Contents");
      }
    });

    it("renders Markdown collection descriptions with the real public editor and bounded list rows", async () => {
      await mount(true);
      await expect
        .element(page.getByText("Public description", { exact: true }))
        .toBeVisible();
      const main = document.querySelector('[role="main"]');
      if (!main) {
        throw new Error("The directory did not render");
      }
      expect(main.querySelectorAll('[contenteditable="true"]')).toHaveLength(0);
      expect(main.querySelector("strong")).toHaveTextContent(
        "Public description"
      );
      const listLink = main.querySelector("li a");
      if (!listLink) {
        throw new Error("The root document list did not render");
      }
      expect(listLink.getBoundingClientRect().right).toBeLessThanOrEqual(
        window.innerWidth
      );
      expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(
        window.innerWidth
      );
    });

    it("keeps desktop contents readable at the tablet breakpoint", async () => {
      const originalWidth = window.innerWidth;
      const originalHeight = window.innerHeight;
      try {
        await page.viewport(breakpoints.tablet, 900);
        await expect.poll(() => window.innerWidth).toBe(breakpoints.tablet);
        await mount();
        await expect
          .element(
            page.getByText("Published body text for the real read-only editor.")
          )
          .toBeVisible();
        await page
          .getByRole("button", { name: "Contents", exact: true })
          .click();
        await expect
          .element(page.getByRole("dialog", { name: "Contents", exact: true }))
          .toBeVisible();
        const contents = document.querySelector("#public-mobile-contents nav");
        if (!contents) {
          throw new Error("Compact contents did not render");
        }
        expect(contents.getBoundingClientRect().width).toBeGreaterThanOrEqual(
          128
        );
        expect(contents.getBoundingClientRect().right).toBeLessThanOrEqual(
          window.innerWidth
        );
      } finally {
        await page.viewport(originalWidth, originalHeight);
        await expect.poll(() => window.innerWidth).toBe(originalWidth);
      }
    });

    it("preserves the reading column when a full desktop contents panel is toggled", async () => {
      await page.viewport(1920, 900);
      await expect.poll(() => window.innerWidth).toBe(1920);
      await mount();
      await expect
        .element(
          page.getByText("Published body text for the real read-only editor.")
        )
        .toBeVisible();
      const title = document.querySelector("article h1");
      const contents = document.querySelector("#docs-reading-contents nav");
      if (!title || !contents) {
        throw new Error("Wide reading columns did not render");
      }
      expect(contents.getBoundingClientRect().width).toBe(256);
      const rootLink = page.getByRole("link", {
        name: "Root guide",
        exact: true,
      });
      const childLink = page.getByRole("link", {
        name: "Child guide",
        exact: true,
      });
      const currentLink = page.getByRole("link", {
        name: info.title,
        exact: true,
      });
      await expect.element(currentLink).toBeVisible();
      const rootPadding = Number.parseFloat(
        getComputedStyle(rootLink.element()).paddingInlineStart
      );
      const childPadding = Number.parseFloat(
        getComputedStyle(childLink.element()).paddingInlineStart
      );
      const currentPadding = Number.parseFloat(
        getComputedStyle(currentLink.element()).paddingInlineStart
      );
      expect(childPadding - rootPadding).toBe(16);
      expect(currentPadding - childPadding).toBe(16);
      expect(
        document.querySelectorAll('#sidebar [aria-current="page"]')
      ).toHaveLength(1);
      const before = title.getBoundingClientRect();
      await page.getByRole("button", { name: "Contents", exact: true }).click();
      expect(document.getElementById("docs-reading-contents")).toBeNull();
      expect(title.getBoundingClientRect().x).toBeCloseTo(before.x, 1);
      expect(title.getBoundingClientRect().width).toBeCloseTo(before.width, 1);
      await page.viewport(390, 844);
      await expect.poll(() => window.innerWidth).toBe(390);
      await page.getByRole("button", { name: "Contents", exact: true }).click();
      await expect
        .element(page.getByRole("dialog", { name: "Contents", exact: true }))
        .toBeVisible();
      await page.viewport(1920, 900);
      await expect.element(page.getByRole("dialog")).not.toBeInTheDocument();
      // A temporary Drawer must not overwrite the user's desktop preference.
      expect(document.getElementById("docs-reading-contents")).toBeNull();
    });
  });
}
