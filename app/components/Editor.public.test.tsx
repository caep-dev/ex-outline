import { renderWithTheme } from "~/test/renderWithTheme";
import { MemoryRouter, Route } from "react-router-dom";
import { cleanup, screen } from "@testing-library/react";
import { Suspense } from "react";
import type { EmbedDescriptor } from "@shared/editor/embeds";
import { vi } from "vitest";
import Editor from "./Editor";
import ExtensionManager from "@shared/editor/lib/ExtensionManager";
import useEmbeds from "~/hooks/useEmbeds";
import baseEmbeds from "@shared/editor/embeds";
import { PublicDocumentView } from "~/scenes/WebsitePublic/PublicDocument";
import userEvent from "@testing-library/user-event";

const mocks = vi.hoisted(() => ({
  publicDocs: {} as Record<string, unknown>,
  integrations: {
    isLoaded: false,
    isFetching: false,
    orderedData: [] as { service: string; settings: { url: string } }[],
    fetchAll: vi.fn().mockResolvedValue(undefined),
  },
  prefetch: vi.fn().mockResolvedValue(undefined),
  unfurl: vi.fn(),
  fetchCollection: vi.fn(),
}));
vi.mock("~/stores", () => ({ default: {} }));
vi.mock("~/hooks/useStores", () => ({
  default: () => ({
    publicDocs: mocks.publicDocs,
    integrations: mocks.integrations,
    auth: {},
    comments: { orderedData: [] },
    documents: { get: vi.fn(), prefetchDocument: mocks.prefetch },
    collections: { get: vi.fn(), fetch: mocks.fetchCollection },
    users: { get: vi.fn() },
    groups: { get: vi.fn() },
    unfurls: { get: vi.fn(), fetchUnfurl: mocks.unfurl },
    ui: {},
  }),
}));
vi.mock("@shared/hooks/useStores", () => ({
  default: () => ({
    documents: { get: vi.fn(), prefetchDocument: mocks.prefetch },
    collections: { get: vi.fn(), fetch: mocks.fetchCollection },
    users: { get: vi.fn() },
    groups: { get: vi.fn() },
    unfurls: { get: vi.fn(), fetchUnfurl: mocks.unfurl },
    auth: {},
  }),
}));
beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
});
afterEach(() => {
  cleanup();
  mocks.integrations.fetchAll.mockClear();
  mocks.prefetch.mockClear();
  mocks.unfurl.mockClear();
  mocks.fetchCollection.mockClear();
  vi.restoreAllMocks();
});
it("renders a public DTO without loading protected embed integrations", () => {
  renderWithTheme(
    <MemoryRouter>
      <Editor
        publicReader
        readOnly
        value={{
          type: "doc",
          content: [
            {
              type: "paragraph",
              content: [{ type: "text", text: "Public body" }],
            },
          ],
        }}
      />
    </MemoryRouter>
  );
  expect(mocks.integrations.fetchAll).not.toHaveBeenCalled();
});
it("keeps public embed descriptors independent of previous member settings and retains URL matching", () => {
  const service = baseEmbeds.find((embed) => embed.name)?.name ?? "";
  mocks.integrations.orderedData = [
    { service, settings: { url: "https://private-team.test" } },
  ];
  let descriptors: EmbedDescriptor[] = [];
  function Embeds({ publicReader }: { publicReader: boolean }) {
    descriptors = useEmbeds(false, publicReader);
    return null;
  }
  const { rerender } = renderWithTheme(<Embeds publicReader={false} />);
  expect(
    descriptors.find((embed) => embed.name === service)?.settings?.url
  ).toBe("https://private-team.test");
  rerender(<Embeds publicReader />);
  expect(
    descriptors.every(
      (embed) => embed.settings === undefined && !embed.disabled
    )
  ).toBe(true);
  expect(typeof descriptors[0].matcher).toBe("function");
  expect(baseEmbeds.every((embed) => embed.settings === undefined)).toBe(true);
});
it("uses the real rich reader with static mentions instead of member prefetch and unfurl", async () => {
  // Security node-view fixture: interaction plugins are separately browser-validated.
  // Vitest mixes CJS/ESM DecorationSet instances in the full interaction stack.
  vi.spyOn(ExtensionManager.prototype, "plugins", "get").mockReturnValue([]);
  renderWithTheme(
    <MemoryRouter>
      <Suspense fallback={<p>Loading reader</p>}>
        <Editor
          publicReader
          value={{
            type: "doc",
            content: [
              {
                type: "heading",
                attrs: { level: 2 },
                content: [{ type: "text", text: "Published heading" }],
              },
              {
                type: "paragraph",
                content: [
                  {
                    type: "mention",
                    attrs: {
                      id: "doc-mention",
                      type: "document",
                      modelId: "private-id",
                      label: "Published document label",
                    },
                  },
                  {
                    type: "mention",
                    attrs: {
                      id: "url-mention",
                      type: "url",
                      modelId: "url",
                      href: "https://example.test",
                      label: "Published URL label",
                    },
                  },
                ],
              },
            ],
          }}
        />
      </Suspense>
    </MemoryRouter>
  );
  expect(
    await screen.findByRole(
      "heading",
      { name: "Published heading" },
      { timeout: 10000 }
    )
  ).toBeTruthy();
  expect(screen.getByText("Published document label")).toBeTruthy();
  expect(mocks.prefetch).not.toHaveBeenCalled();
  expect(mocks.unfurl).not.toHaveBeenCalled();
  expect(mocks.fetchCollection).not.toHaveBeenCalled();
}, 15000);
it("initializes the public adapter contents using the actual wrapper and lazy core refs", async () => {
  const user = userEvent.setup();
  vi.spyOn(ExtensionManager.prototype, "plugins", "get").mockReturnValue([]);
  mocks.publicDocs = {
    generation: 0,
    documentKey: "published",
    collections: { data: [] },
    document: {
      status: "ready",
      data: {
        id: "published",
        title: "Public title",
        collectionId: "c",
        content: {
          type: "doc",
          content: [
            {
              type: "heading",
              attrs: { level: 2 },
              content: [{ type: "text", text: "Initial heading" }],
            },
          ],
        },
      },
    },
    loadDocument: vi.fn().mockResolvedValue(undefined),
    leaveRoute: vi.fn(),
  };
  renderWithTheme(
    <MemoryRouter initialEntries={["/doc/published"]}>
      <Suspense fallback={<p>Loading reader</p>}>
        <Route path="/doc/:documentSlug">
          <PublicDocumentView />
        </Route>
      </Suspense>
    </MemoryRouter>
  );
  expect(
    await screen.findByRole(
      "heading",
      { name: "Initial heading" },
      { timeout: 10000 }
    )
  ).toBeTruthy();
  expect(
    await screen.findAllByRole("link", {
      name: "Initial heading",
    })
  ).toHaveLength(1);
  expect(screen.getAllByRole("navigation", { name: "Contents" })).toHaveLength(
    1
  );
  expect(screen.getByRole("navigation", { name: "Contents" })).toBeVisible();
  const toggle = screen.getByRole("button", { name: "Contents" });
  toggle.focus();
  await user.keyboard("{Enter}");
  expect(screen.queryByRole("link", { name: "Initial heading" })).toBeNull();
  await user.keyboard("{Enter}");
  expect(screen.getAllByRole("link", { name: "Initial heading" })).toHaveLength(
    1
  );
  expect(toggle).toHaveAttribute("aria-expanded", "true");
  expect(screen.queryByText("Something went wrong")).toBeNull();
  expect(mocks.integrations.fetchAll).not.toHaveBeenCalled();
}, 15000);
