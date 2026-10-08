import type * as UrlHelpers from "~/utils/urls";
import i18n from "i18next";
import en from "../../shared/i18n/locales/en_US/translation.json";
import zh from "../../shared/i18n/locales/zh_CN/translation.json";
import {
  act,
  cleanup,
  fireEvent,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter, Route, useLocation, Router } from "react-router-dom";
import history from "~/utils/history";
import userEvent from "@testing-library/user-event";
import { HelmetProvider } from "react-helmet-async";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { renderWithTheme } from "~/test/renderWithTheme";
import { PublicDocsStore } from "~/stores/PublicDocsStore";
import UiStore from "~/stores/UiStore";
import type RootStore from "~/stores/RootStore";
import { AuthorizationError, NotFoundError } from "~/utils/errors";
import WebsitePublic, { PublicDocumentView } from "./WebsitePublic";
import { WebsiteIdentityController } from "~/components/WebsiteIdentityController";
import { DocsReadingResume } from "~/components/DocsReadingResume";

const mocks = vi.hoisted(() => ({
  post: vi.fn().mockResolvedValue(undefined),
  fetch: vi.fn(),
  redirect: vi.fn(),
  probeMount: vi.fn(),
  probeCallbacks: [] as ((status: "active" | "unavailable") => void)[],
  auth: {
    authenticated: false,
    websiteIntegrationEnabled: true,
    sessionGeneration: 1,
    isFetching: false,
    integrationAuthUnavailable: false,
    config: {
      websiteIntegrationEnabled: true,
      initialized: true,
      providers: [],
    } as
      | {
          websiteIntegrationEnabled: boolean;
          initialized: boolean;
          providers: never[];
        }
      | undefined,
    websiteIntegrationInitialized: true,
    fetchConfig: vi.fn(),
    fetchAuth: vi.fn(),
  },
  store: undefined as PublicDocsStore | undefined,
  ui: undefined as UiStore | undefined,
  mobile: false,
  editorHeadings: [] as {
    id: string;
    title: string;
    level: number;
    inTable: boolean;
  }[],
  scrollToAnchor: vi.fn(),
}));
vi.mock("~/env", () => ({
  default: {
    URL: "https://example.test/docs",
    WEBSITE_URL: "https://example.test",
  },
}));
vi.mock("~/stores", () => ({ default: {} }));
vi.mock("~/utils/history", async () => ({
  default: (await import("history")).createMemoryHistory(),
}));
vi.mock("~/hooks/useMobile", () => ({ default: () => mocks.mobile }));
vi.mock("~/hooks/useStores", () => ({
  default: () => ({ auth: mocks.auth, publicDocs: mocks.store, ui: mocks.ui }),
}));
vi.mock("~/utils/ApiClient", () => ({
  client: {
    post: mocks.post,
    fetch: mocks.fetch,
    setUnauthorizedHandler: vi.fn(),
  },
}));
vi.mock("~/utils/urls", async (importOriginal) => ({
  ...(await importOriginal<typeof UrlHelpers>()),
  redirectTo: mocks.redirect,
}));
vi.mock("~/components/WebsiteSessionProbe", async () => {
  const React = await import("react");
  return {
    WebsiteSessionProbe: ({
      onStatus,
    }: {
      onStatus: (status: "active" | "unavailable") => void;
    }) => {
      const initialStatus = React.useRef(onStatus);
      React.useEffect(() => {
        mocks.probeMount();
        mocks.probeCallbacks.push(initialStatus.current);
      }, []);
      return (
        <>
          <button
            data-testid="session-probe"
            onClick={() => onStatus("active")}
          >
            Probe session
          </button>
          <button onClick={() => onStatus("unavailable")}>
            Unavailable probe
          </button>
        </>
      );
    },
  };
});
vi.mock("~/components/Editor", async () => {
  const React = await import("react");
  return {
    default: React.forwardRef(function ProjectionEditor(
      {
        value,
        publicReader,
        readOnly,
        onInit,
      }: {
        value: unknown;
        publicReader: boolean;
        readOnly: boolean;
        onInit?: () => void;
      },
      ref
    ) {
      // The lazy core may initialize before the wrapper assigns its forwarded ref.
      React.useLayoutEffect(() => {
        onInit?.();
      }, [onInit]);
      React.useImperativeHandle(ref, () => ({
        getHeadings: () =>
          mocks.editorHeadings.map((heading) => ({ ...heading })),
        scrollToAnchor: mocks.scrollToAnchor,
      }));
      return (
        <div
          data-testid="reader"
          data-public={publicReader}
          data-readonly={readOnly}
        >
          {JSON.stringify(value)}
        </div>
      );
    }),
  };
});

const collection = {
  id: "collection-1",
  name: "Guides",
  description: "Public guide",
  url: "/public/collection/collection-1",
};
const info = {
  id: "doc-1",
  collectionId: "collection-1",
  title: "Welcome",
  content: {
    type: "doc",
    content: [
      { type: "paragraph", content: [{ type: "text", text: "English body" }] },
    ],
  },
  url: "/doc/welcome-1234567890",
  updatedAt: "2026-10-06",
};
const doc = {
  id: info.id,
  title: info.title,
  url: info.url,
  parentDocumentId: null,
  updatedAt: info.updatedAt,
};
const page = <T,>(data: T[], offset = 0, hasMore = false) => ({
  data,
  pagination: { offset, limit: 100, hasMore },
});
function renderPublic(path: string, comments = false, routeControl = false) {
  return renderWithTheme(
    <HelmetProvider>
      <MemoryRouter initialEntries={[path]}>
        <Route
          render={({ location }) => (
            <output data-testid="reading-location">
              {location.pathname + location.search + location.hash}
            </output>
          )}
        />
        {routeControl && (
          <Route
            render={({ history }) => (
              <button onClick={() => history.push("/search")}>
                Navigate search route
              </button>
            )}
          />
        )}
        <WebsiteIdentityController>
          <Route
            exact
            path="/"
            render={() => <WebsitePublic kind="directory" />}
          />
          <Route
            exact
            path="/public/collection/:collectionId"
            render={() => <WebsitePublic kind="directory" />}
          />
          <Route
            exact
            path="/doc/:documentSlug"
            render={() =>
              comments ? (
                <PublicDocumentView allowComments />
              ) : (
                <WebsitePublic kind="document" />
              )
            }
          />
          <Route
            exact
            path="/search"
            render={() => <WebsitePublic kind="search" />}
          />
        </WebsiteIdentityController>
      </MemoryRouter>
    </HelmetProvider>
  );
}

beforeEach(() => {
  i18n
    .addResources("en-US", "translation", en)
    .addResources("zh-CN", "translation", zh);
  mocks.post.mockReset();
  mocks.fetch.mockReset();
  mocks.redirect.mockReset();
  sessionStorage.clear();
  mocks.store = new PublicDocsStore();
  mocks.mobile = false;
  mocks.editorHeadings = [];
  mocks.scrollToAnchor.mockReset();
  mocks.ui = new UiStore({} as RootStore);
  mocks.auth.authenticated = false;
  mocks.auth.integrationAuthUnavailable = false;
  mocks.auth.config = {
    websiteIntegrationEnabled: true,
    initialized: true,
    providers: [],
  };
  mocks.auth.fetchConfig.mockReset();
  mocks.auth.fetchAuth.mockReset();
  mocks.probeMount.mockClear();
  mocks.probeCallbacks = [];
  mocks.auth.websiteIntegrationInitialized = true;
  mocks.fetch.mockImplementation((path) =>
    Promise.resolve(
      path === "/public.documents.info"
        ? { data: info }
        : path === "/public.collections.list"
          ? page([collection])
          : path === "/public.documents.list"
            ? page([doc])
            : page([])
    )
  );
  mocks.post.mockImplementation((path, body) =>
    mocks.fetch(path, "POST", body)
  );
});
afterEach(async () => {
  cleanup();
  await i18n.changeLanguage("en-US");
});

it("shows the shared public navigation and lazily loads an expanded collection", async () => {
  renderPublic("/");
  expect(screen.getByRole("button", { name: "Collapse sidebar" })).toHaveStyle({
    background: "transparent",
    boxShadow: "none",
  });
  const nav = await screen.findByRole("navigation", {
    name: "Documents navigation",
  });
  expect(within(nav).getByRole("link", { name: "Guides" })).toBeInTheDocument();
  expect(mocks.fetch.mock.calls.map((call) => call[0])).toEqual([
    "/public.collections.list",
  ]);
  fireEvent.click(within(nav).getByRole("button", { name: "Expand Guides" }));
  expect(
    await within(nav).findByRole("link", { name: "Welcome" })
  ).toHaveAttribute("href", "/doc/welcome-1234567890");
  expect(
    within(nav).getByRole("button", { name: "Login" })
  ).toBeInTheDocument();
});
it("shows shared error status with retry rather than an empty directory", async () => {
  mocks.fetch.mockRejectedValueOnce(new Error("private database detail"));
  renderPublic("/");
  const main = screen.getByRole("main");
  expect(await within(main).findByRole("alert")).toHaveTextContent(
    "temporarily unavailable"
  );
  expect(main).not.toHaveTextContent("private database detail");
  fireEvent.click(within(main).getByRole("button", { name: "Retry" }));
  expect(
    await within(main).findByRole("link", { name: "Guides" })
  ).toBeTruthy();
});
it("shows a safe pagination reason and rebuilds comment pagination from the first page", async () => {
  mocks.auth.authenticated = true;
  let retry = false;
  mocks.fetch.mockImplementation((path, _method, body) => {
    if (path === "/comments.list") {
      return Promise.resolve({
        data: retry ? [] : [],
        pagination: { offset: body.offset, limit: 100, total: retry ? 0 : 101 },
      });
    }
    return Promise.resolve(
      path === "/public.documents.info"
        ? { data: info }
        : path === "/public.collections.list"
          ? page([collection])
          : page([doc])
    );
  });
  renderPublic("/doc/welcome-1234567890", true);
  const comments = await screen.findByRole("region", { name: "Comments" });
  expect(await within(comments).findByRole("alert")).toHaveTextContent(
    "Pagination could not complete"
  );
  retry = true;
  fireEvent.click(within(comments).getByRole("button", { name: "Retry" }));
  await waitFor(() => expect(within(comments).queryByRole("alert")).toBeNull());
  expect(
    mocks.fetch.mock.calls
      .filter((call) => call[0] === "/comments.list")
      .map((call) => call[2].offset)
  ).toEqual([0, 0]);
});
it("renders public ProseMirror in the shared reading frame using explicit safe-editor capability", async () => {
  renderPublic("/doc/welcome-1234567890");
  expect(await screen.findByRole("heading", { name: "Welcome" })).toBeTruthy();
  expect(screen.getByTestId("reader")).toHaveAttribute("data-public", "true");
  expect(screen.getByTestId("reader")).toHaveTextContent(
    JSON.stringify(info.content)
  );
  expect(mocks.post).not.toHaveBeenCalled();
  expect(
    mocks.fetch.mock.calls.every((call) =>
      [
        "/public.collections.list",
        "/public.documents.list",
        "/public.documents.info",
      ].includes(call[0])
    )
  ).toBe(true);
});
it("collects initial headings when onInit precedes the forwarded editor ref", async () => {
  mocks.editorHeadings = [
    { id: "overview", title: "Overview", level: 1, inTable: false },
    { id: "table-heading", title: "Inside table", level: 2, inTable: true },
  ];
  renderPublic("/doc/welcome-1234567890");
  await screen.findByRole("button", { name: "Contents" });
  const contents = document.getElementById("docs-reading-contents");
  if (!contents) {
    throw new Error("Expected initialized desktop contents");
  }
  expect(
    within(contents).queryByRole("link", { name: "Inside table", hidden: true })
  ).toBeNull();
  fireEvent.click(
    within(contents).getByRole("link", { name: "Overview", hidden: true })
  );
  expect(mocks.scrollToAnchor).toHaveBeenCalledWith("#overview");
});
it("toggles mobile public contents with the keyboard and selects a heading without member preference calls", async () => {
  const user = userEvent.setup();
  mocks.mobile = true;
  mocks.editorHeadings = [
    { id: "overview", title: "Overview", level: 1, inTable: false },
    { id: "details", title: "Details", level: 2, inTable: false },
  ];
  renderPublic("/doc/welcome-1234567890");
  const toggle = await screen.findByRole("button", { name: "Contents" });
  expect(screen.queryByRole("navigation", { name: "Contents" })).toBeNull();
  toggle.focus();
  await user.keyboard("{Enter}");
  expect(await screen.findByRole("dialog")).toBeVisible();
  expect(screen.getAllByRole("navigation", { name: "Contents" })).toHaveLength(
    1
  );
  await user.keyboard("{Escape}");
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  await waitFor(() => expect(toggle).toHaveFocus());
  await user.keyboard("{Enter}");
  (await screen.findByRole("link", { name: "Details" })).focus();
  await user.keyboard("{Enter}");
  expect(mocks.scrollToAnchor).toHaveBeenCalledWith("#details");
  expect(screen.getByTestId("reading-location")).toHaveTextContent(
    "/doc/welcome-1234567890#details"
  );
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  await waitFor(() => expect(toggle).toHaveFocus());
  expect(mocks.post).not.toHaveBeenCalled();
  expect(
    mocks.fetch.mock.calls.every((call) => call[0].startsWith("/public."))
  ).toBe(true);
});
it("removes a revoked document instead of retaining its title", async () => {
  mocks.fetch.mockImplementation((path) =>
    path === "/public.documents.info"
      ? Promise.reject(new NotFoundError())
      : Promise.resolve(page([collection]))
  );
  renderPublic("/doc/welcome-1234567890");
  expect(await screen.findByRole("alert")).toHaveTextContent("Not found");
  expect(screen.queryByRole("heading", { name: "Welcome" })).toBeNull();
  const missing = screen.getByRole("alert");
  expect(within(missing).getAllByText("Not found")).toHaveLength(1);
  expect(within(missing).queryByRole("button", { name: "Retry" })).toBeNull();
  fireEvent.click(within(missing).getByRole("link", { name: "Back to home" }));
  expect(screen.getByTestId("reading-location")).toHaveTextContent("/");
});
it("a collection route loads all document pages with shared navigation state", async () => {
  renderPublic("/public/collection/collection-1");
  expect(
    await within(screen.getByRole("main")).findByRole("link", {
      name: "Welcome",
    })
  ).toHaveAttribute("href", info.url);
  expect(
    mocks.fetch.mock.calls.filter(
      (call) => call[0] === "/public.documents.list"
    )
  ).toHaveLength(1);
});
it("uses shared search input and public results with only supported query fields", async () => {
  mocks.fetch.mockImplementation((path) =>
    Promise.resolve(
      path === "/public.collections.list"
        ? page([collection])
        : page([{ ...doc, collectionId: collection.id, excerpt: "Match" }])
    )
  );
  renderPublic("/search?q=topic&collectionId=collection-1&includeDrafts=true");
  expect(await screen.findByRole("link", { name: "Welcome" })).toHaveAttribute(
    "href",
    info.url
  );
  expect(mocks.fetch).toHaveBeenCalledWith("/public.documents.search", "POST", {
    query: "topic",
    collectionId: "collection-1",
    offset: 0,
    limit: 100,
  });
});
it("submits public search with Enter and clears collection scope through the native filter", async () => {
  mocks.fetch.mockImplementation((path) =>
    Promise.resolve(
      path === "/public.collections.list" ? page([collection]) : page([])
    )
  );
  renderPublic("/search?q=topic&collectionId=collection-1");
  const input = await screen.findByRole("searchbox", { name: "Search" });
  await userEvent.clear(input);
  await userEvent.type(input, "  guide  {Enter}");
  await waitFor(() =>
    expect(mocks.fetch).toHaveBeenCalledWith(
      "/public.documents.search",
      "POST",
      {
        query: "guide",
        collectionId: "collection-1",
        offset: 0,
        limit: 100,
      }
    )
  );
  await userEvent.click(await screen.findByRole("button", { name: "Guides" }));
  await userEvent.click(
    await screen.findByRole("menuitem", { name: "Any collection" })
  );
  await waitFor(() =>
    expect(screen.getByTestId("reading-location")).toHaveTextContent(
      "/search?q=guide"
    )
  );
  expect(screen.getByTestId("reading-location")).not.toHaveTextContent(
    "collectionId"
  );
  await waitFor(() =>
    expect(mocks.fetch).toHaveBeenCalledWith(
      "/public.documents.search",
      "POST",
      {
        query: "guide",
        collectionId: undefined,
        offset: 0,
        limit: 100,
      }
    )
  );
  expect(mocks.post).not.toHaveBeenCalled();
  expect(mocks.redirect).not.toHaveBeenCalled();
});
it("does not load public DTOs or sign in before workspace bootstrap", () => {
  mocks.auth.config = {
    websiteIntegrationEnabled: true,
    initialized: false,
    providers: [],
  };
  mocks.auth.websiteIntegrationInitialized = false;
  renderPublic("/");
  expect(
    screen.getByText("The document library is not initialized yet.")
  ).toBeTruthy();
  expect(screen.getByRole("button", { name: "Login" })).toBeDisabled();
  expect(mocks.fetch).not.toHaveBeenCalled();
});
it("allows authorized comments without any private document side requests", async () => {
  mocks.auth.authenticated = true;
  let count = 0;
  mocks.fetch.mockImplementation((path) => {
    if (path === "/comments.list") {
      return Promise.resolve({
        data: [
          {
            id: "comment",
            data: {
              type: "doc",
              content: [
                {
                  type: "paragraph",
                  content: [
                    {
                      type: "text",
                      text: ++count === 1 ? "Existing comment" : "New comment",
                    },
                  ],
                },
              ],
            },
            createdBy: { id: "reader", name: "Reader", avatarUrl: null },
            resolvedBy: null,
          },
        ],
        pagination: { offset: 0, limit: 100, total: 1 },
      });
    }
    return Promise.resolve(
      path === "/public.documents.info"
        ? { data: info }
        : path === "/public.collections.list"
          ? page([collection])
          : page([doc])
    );
  });
  mocks.post.mockResolvedValue({ data: { id: "new" } });
  renderPublic("/doc/welcome-1234567890", true);
  expect(await screen.findByText("Existing comment")).toBeTruthy();
  fireEvent.change(screen.getByRole("textbox", { name: "Comment" }), {
    target: { value: "New comment" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Post" }));
  expect(await screen.findByText("New comment")).toBeTruthy();
  expect(mocks.post).toHaveBeenCalledWith("/comments.create", {
    documentId: "doc-1",
    text: "New comment",
  });
});
it("unmounts comments and content when identity changes", async () => {
  mocks.auth.authenticated = true;
  mocks.fetch.mockImplementation((path) =>
    path === "/comments.list"
      ? Promise.resolve({
          data: [],
          pagination: { offset: 0, limit: 100, total: 0 },
        })
      : Promise.resolve(
          path === "/public.documents.info"
            ? { data: info }
            : path === "/public.collections.list"
              ? page([collection])
              : page([doc])
        )
  );
  renderPublic("/doc/welcome-1234567890", true);
  expect(await screen.findByRole("textbox", { name: "Comment" })).toBeTruthy();
  mocks.auth.authenticated = false;
  mocks.store?.invalidate();
  await waitFor(() =>
    expect(screen.queryByRole("textbox", { name: "Comment" })).toBeNull()
  );
});
it("rechecks and hides public content when comment authorization is revoked", async () => {
  mocks.auth.authenticated = true;
  let reads = 0;
  mocks.fetch.mockImplementation((path) => {
    if (path === "/public.documents.info") {
      return ++reads === 1
        ? Promise.resolve({ data: info })
        : Promise.reject(new NotFoundError());
    }
    if (path === "/comments.list") {
      return Promise.reject(new AuthorizationError());
    }
    return Promise.resolve(
      path === "/public.collections.list" ? page([collection]) : page([doc])
    );
  });
  renderPublic("/doc/welcome-1234567890", true);
  expect(await screen.findByRole("alert")).toHaveTextContent("Not found");
  expect(screen.queryByRole("heading", { name: "Welcome" })).toBeNull();
});
it("forces the real public adapter to revalidate a comment revocation while its document tree is pending", async () => {
  mocks.auth.authenticated = true;
  let finishTree: (value: ReturnType<typeof page>) => void = () => {};
  const tree = new Promise<ReturnType<typeof page>>((resolve) => {
    finishTree = resolve;
  });
  let reads = 0;
  mocks.fetch.mockImplementation((path) =>
    path === "/public.documents.info"
      ? ++reads === 1
        ? Promise.resolve({ data: info })
        : Promise.reject(new NotFoundError())
      : path === "/comments.list"
        ? Promise.reject(new AuthorizationError())
        : path === "/public.collections.list"
          ? Promise.resolve(page([collection]))
          : tree
  );
  renderPublic("/doc/welcome-1234567890", true);
  expect(await screen.findByRole("alert")).toHaveTextContent("Not found");
  expect(reads).toBe(2);
  await act(async () => {
    finishTree(page([doc], 0, true));
    await tree;
  });
  expect(screen.queryByRole("heading", { name: "Welcome" })).toBeNull();
  expect(screen.queryByRole("link", { name: "Welcome" })).toBeNull();
  expect(
    mocks.fetch.mock.calls.filter(
      (call) => call[0] === "/public.documents.list"
    )
  ).toHaveLength(1);
});
it("keeps a fresh 404 stable and removes previously loaded sidebar document titles", async () => {
  const first = renderPublic("/doc/welcome-1234567890");
  expect(await screen.findByRole("link", { name: "Welcome" })).toBeTruthy();
  first.unmount();
  mocks.fetch.mockImplementation((path) =>
    path === "/public.documents.info"
      ? Promise.reject(new NotFoundError())
      : Promise.resolve(page([collection]))
  );
  renderPublic("/doc/welcome-1234567890");
  expect(await screen.findByRole("alert")).toHaveTextContent("Not found");
  expect(screen.queryByRole("link", { name: "Welcome" })).toBeNull();
  expect(mocks.store?.generation).toBe(0);
  expect(
    mocks.fetch.mock.calls.filter(
      (call) => call[0] === "/public.documents.info"
    )
  ).toHaveLength(2);
});
it("restores navigation expansion after leaving a pending tree for search", async () => {
  let finishTree: (value: ReturnType<typeof page>) => void = () => {};
  const tree = new Promise<ReturnType<typeof page>>((resolve) => {
    finishTree = resolve;
  });
  mocks.fetch.mockImplementation((path) =>
    path === "/public.collections.list"
      ? Promise.resolve(page([collection]))
      : tree
  );
  renderPublic("/", false, true);
  const navigation = await screen.findByRole("navigation", {
    name: "Documents navigation",
  });
  fireEvent.click(
    within(navigation).getByRole("button", { name: "Expand Guides" })
  );
  // Shared fast NavLink intentionally ignores untrusted jsdom click events.
  fireEvent.click(
    screen.getByRole("button", { name: "Navigate search route" })
  );
  const searchNavigation = await screen.findByRole("navigation", {
    name: "Documents navigation",
  });
  expect(
    within(searchNavigation).getByRole("button", { name: "Expand Guides" })
  ).toHaveAttribute("aria-expanded", "false");
  await act(async () => {
    finishTree(page([doc], 0, true));
    await tree;
  });
  mocks.fetch.mockResolvedValueOnce(page([doc]));
  fireEvent.click(
    within(searchNavigation).getByRole("button", { name: "Expand Guides" })
  );
  expect(
    await within(searchNavigation).findByRole("link", { name: "Welcome" })
  ).toBeTruthy();
});
it("preserves failed comment input and retries the submission through shared error status", async () => {
  mocks.auth.authenticated = true;
  mocks.post
    .mockRejectedValueOnce(new Error("private upstream detail"))
    .mockResolvedValueOnce({ data: { id: "new" } });
  renderPublic("/doc/welcome-1234567890", true);
  const input = await screen.findByRole("textbox", { name: "Comment" });
  fireEvent.change(input, { target: { value: "Keep this comment" } });
  fireEvent.click(screen.getByRole("button", { name: "Post" }));
  const failure = await screen.findByRole("alert");
  expect(
    within(failure).getByRole("heading", { name: "Comments" })
  ).toBeTruthy();
  expect(failure.querySelector("svg")).toBeTruthy();
  expect(failure).toHaveTextContent(
    "Could not post your comment. Please retry."
  );
  expect(failure).not.toHaveTextContent("private upstream detail");
  expect(input).toHaveValue("Keep this comment");
  fireEvent.click(within(failure).getByRole("button", { name: "Retry" }));
  await waitFor(() => expect(input).toHaveValue(""));
  expect(mocks.post.mock.calls).toEqual(
    Array.from({ length: 2 }, () => [
      "/comments.create",
      { documentId: "doc-1", text: "Keep this comment" },
    ])
  );
});
it.each(["identity", "reader"])(
  "does not retry a failed comment after the verified %s leaves",
  async (boundary) => {
    mocks.auth.authenticated = true;
    mocks.post.mockRejectedValueOnce(new Error("failed"));
    renderPublic("/doc/welcome-1234567890", true);
    fireEvent.change(await screen.findByRole("textbox", { name: "Comment" }), {
      target: { value: "Keep this comment" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Post" }));
    const retry = await within(await screen.findByRole("alert")).findByRole(
      "button",
      { name: "Retry" }
    );
    act(() => {
      if (boundary === "identity") {
        mocks.auth.authenticated = false;
      } else {
        mocks.store?.leaveRoute();
      }
      fireEvent.click(retry);
    });
    expect(mocks.post).toHaveBeenCalledTimes(1);
  }
);
it("owns one identity probe across navigation and body and preserves OIDC returnTo suppression", async () => {
  const first = renderPublic("/doc/welcome-1234567890?revision=1");
  expect(screen.getAllByTestId("session-probe")).toHaveLength(1);
  fireEvent.click(screen.getByTestId("session-probe"));
  expect(mocks.redirect).toHaveBeenCalledTimes(1);
  const target = new URL(mocks.redirect.mock.calls[0][0]);
  expect(target.pathname).toBe("/docs/auth/oidc");
  expect(target.searchParams.get("returnTo")).toBe(
    "/docs/doc/welcome-1234567890?revision=1"
  );
  first.unmount();
  renderPublic("/doc/welcome-1234567890?revision=1");
  fireEvent.click(screen.getByTestId("session-probe"));
  expect(mocks.redirect).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", { name: "Login" }));
  expect(mocks.redirect).toHaveBeenCalledTimes(2);
});
it("keeps public reading and explicit sign-in after a failed OIDC return", async () => {
  renderPublic("/doc/welcome-1234567890#website-signin-unavailable");
  fireEvent.click(screen.getByTestId("session-probe"));
  expect(mocks.redirect).not.toHaveBeenCalled();
  expect(await screen.findByRole("heading", { name: "Welcome" })).toBeTruthy();
  expect(within(screen.getByRole("main")).queryByRole("alert")).toBeNull();
  fireEvent.click(
    within(
      screen.getByRole("navigation", { name: "Documents navigation" })
    ).getByRole("button", { name: "Retry" })
  );
  expect(mocks.redirect).toHaveBeenCalledTimes(1);
});
it("retries configuration failure through the actual error Retry and restores public reading", async () => {
  mocks.auth.config = undefined;
  mocks.auth.websiteIntegrationInitialized = false;
  mocks.auth.fetchConfig
    .mockRejectedValueOnce(new Error("private config detail"))
    .mockImplementationOnce(async () => {
      mocks.auth.config = {
        websiteIntegrationEnabled: true,
        initialized: true,
        providers: [],
      };
      mocks.auth.websiteIntegrationInitialized = true;
    });
  renderPublic("/");
  const error = await screen.findByRole("alert");
  expect(error).not.toHaveTextContent("private config detail");
  fireEvent.click(within(error).getByRole("button", { name: "Retry" }));
  expect(
    await within(screen.getByRole("main")).findByRole("link", {
      name: "Guides",
    })
  ).toBeVisible();
  expect(mocks.auth.fetchConfig).toHaveBeenCalledTimes(2);
  expect(mocks.redirect).not.toHaveBeenCalled();
});
it("retries a Website probe by remounting the probe without launching anonymous OIDC", async () => {
  renderPublic("/");
  fireEvent.click(screen.getByRole("button", { name: "Unavailable probe" }));
  const navigation = screen.getByRole("navigation", {
    name: "Documents navigation",
  });
  fireEvent.click(
    await within(navigation).findByRole("button", { name: "Retry" })
  );
  expect(mocks.probeMount).toHaveBeenCalledTimes(2);
  expect(mocks.auth.fetchAuth).not.toHaveBeenCalled();
  expect(mocks.redirect).not.toHaveBeenCalled();
});
it("ignores the old probe after an explicit retry and preserves one automatic OIDC attempt", async () => {
  renderPublic("/");
  const previous = mocks.probeCallbacks[0];
  fireEvent.click(screen.getByRole("button", { name: "Unavailable probe" }));
  fireEvent.click(
    within(
      screen.getByRole("navigation", { name: "Documents navigation" })
    ).getByRole("button", {
      name: "Retry",
    })
  );
  act(() => previous("active"));
  expect(mocks.redirect).not.toHaveBeenCalled();
  fireEvent.click(screen.getByTestId("session-probe"));
  fireEvent.click(screen.getByTestId("session-probe"));
  expect(mocks.redirect).toHaveBeenCalledTimes(1);
});

function FinalResumeRoute() {
  const location = useLocation<{ docsReadingResume?: boolean }>();
  return location.state?.docsReadingResume ? (
    <DocsReadingResume />
  ) : (
    <>
      <Route exact path="/">
        <WebsitePublic kind="directory" />
      </Route>
      <Route path="/doc/:documentSlug">
        <WebsitePublic kind="document" />
      </Route>
    </>
  );
}
function mountTwoStage() {
  history.replace(
    "/?docsResume=" +
      encodeURIComponent("/docs/doc/welcome-1234567890?q=privacy")
  );
  return renderWithTheme(
    <HelmetProvider>
      <Router history={history}>
        <WebsiteIdentityController>
          <FinalResumeRoute />
        </WebsiteIdentityController>
      </Router>
    </HelmetProvider>
  );
}
it("keeps the final SPA preflight pending/error in one shell and retries with document q intact", async () => {
  let rejectFinal: (error: Error) => void = () => {};
  let reads = 0;
  mocks.fetch.mockImplementation((path) => {
    if (path === "/public.documents.info") {
      if (++reads === 2) {
        return new Promise((_done, reject) => {
          rejectFinal = reject;
        });
      }
      return Promise.resolve({ data: info });
    }
    return Promise.resolve(
      path === "/public.collections.list" ? page([collection]) : page([doc])
    );
  });
  mountTwoStage();
  await waitFor(() => expect(reads).toBe(2));
  expect(screen.getAllByRole("main")).toHaveLength(1);
  expect(screen.getByRole("link", { name: "Exre Service" })).toBeVisible();
  expect(
    screen.getByRole("navigation", { name: "Documents navigation" })
  ).toBeVisible();
  const pending = within(screen.getByRole("main")).getByRole("status");
  expect(pending).toHaveAttribute("aria-busy", "true");
  expect(pending.querySelector("svg")).toBeVisible();
  expect(mocks.redirect).not.toHaveBeenCalled();
  rejectFinal(new Error("private upstream detail"));
  const failure = await within(screen.getByRole("main")).findByRole("alert");
  expect(failure).not.toHaveTextContent("private upstream detail");
  fireEvent.click(within(failure).getByRole("button", { name: "Retry" }));
  await screen.findByRole("heading", { name: "Welcome" });
  expect(history.location.pathname + history.location.search).toBe(
    "/doc/welcome-1234567890?q=privacy"
  );
  expect(reads).toBe(4);
});
it.each([1, 2])(
  "keeps a 404 at recovery phase %s generic and returns to the public overview",
  async (phase) => {
    let reads = 0;
    mocks.fetch.mockImplementation((path) => {
      if (path === "/public.documents.info") {
        return ++reads === phase
          ? Promise.reject(new NotFoundError())
          : Promise.resolve({ data: info });
      }
      return Promise.resolve(page([collection]));
    });
    mountTwoStage();
    const unavailable = await screen.findByRole("alert");
    expect(screen.getAllByRole("main")).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Exre Service" })).toBeVisible();
    expect(
      screen.getByRole("navigation", { name: "Documents navigation" })
    ).toBeVisible();
    expect(unavailable).not.toHaveTextContent("Welcome");
    expect(screen.queryByRole("heading", { name: "Welcome" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Back to documents" }));
    await within(screen.getByRole("main")).findByRole("link", {
      name: "Guides",
    });
    expect(history.location.pathname).toBe("/");
  }
);
it.each([1, 2])(
  "clears a previously expanded target title when recovery phase %s confirms revocation",
  async (phase) => {
    let rejectTarget: (error: Error) => void = () => {};
    let reads = 0;
    mocks.fetch.mockImplementation((path) => {
      if (path === "/public.documents.info") {
        return ++reads === phase
          ? new Promise((_done, reject) => {
              rejectTarget = reject;
            })
          : Promise.resolve({ data: info });
      }
      return Promise.resolve(
        path === "/public.collections.list" ? page([collection]) : page([doc])
      );
    });
    await mocks.store?.loadNextCollections();
    mountTwoStage();
    await waitFor(() => expect(reads).toBe(phase));
    const navigation = screen.getByRole("navigation", {
      name: "Documents navigation",
    });
    fireEvent.click(
      within(navigation).getByRole("button", { name: "Expand Guides" })
    );
    expect(
      await within(navigation).findByRole("link", { name: "Welcome" })
    ).toBeVisible();
    rejectTarget(new NotFoundError());
    await screen.findByRole("alert");
    expect(
      screen.getByRole("navigation", { name: "Documents navigation" })
    ).toBeVisible();
    expect(screen.queryByRole("link", { name: "Welcome" })).toBeNull();
    expect(screen.queryByText("Welcome")).toBeNull();
    expect(screen.getAllByRole("main")).toHaveLength(1);
  }
);
it("keeps identity failure and its retry in navigation while public reading stays available", async () => {
  mocks.auth.integrationAuthUnavailable = true;
  mocks.auth.fetchAuth.mockRejectedValue(new Error("unavailable"));
  renderPublic("/");
  expect(screen.queryByTestId("session-probe")).toBeNull();
  const main = screen.getByRole("main");
  expect(
    await within(main).findByRole("link", { name: "Guides" })
  ).toBeTruthy();
  expect(within(main).queryByRole("alert")).toBeNull();
  expect(within(main).queryByRole("button", { name: "Retry" })).toBeNull();
  const navigation = screen.getByRole("navigation", {
    name: "Documents navigation",
  });
  expect(
    within(navigation).getByRole("button", { name: "Login" })
  ).toBeEnabled();
  fireEvent.click(within(navigation).getByRole("button", { name: "Retry" }));
  expect(mocks.auth.fetchAuth).toHaveBeenCalledTimes(1);
});
it("keeps an empty directory free of identity alerts and removes sidebar retry when the probe recovers", async () => {
  mocks.fetch.mockResolvedValue(page([]));
  renderPublic("/");
  const main = screen.getByRole("main");
  const navigation = screen.getByRole("navigation", {
    name: "Documents navigation",
  });
  await within(main).findByRole("heading", { name: "No public collections" });
  expect(
    within(navigation).queryByRole("button", { name: "Retry" })
  ).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Unavailable probe" }));
  expect(within(main).queryByRole("alert")).toBeNull();
  expect(
    within(navigation).getByRole("button", { name: "Retry" })
  ).toBeEnabled();
  fireEvent.click(within(navigation).getByRole("button", { name: "Retry" }));
  expect(
    within(navigation).queryByRole("button", { name: "Retry" })
  ).toBeNull();
  expect(
    within(main).getByRole("heading", { name: "No public collections" })
  ).toBeVisible();
  expect(mocks.redirect).not.toHaveBeenCalled();
});
it("opens the mobile sidebar so login, identity retry, and search stay reachable", async () => {
  mocks.mobile = true;
  mocks.auth.integrationAuthUnavailable = true;
  renderPublic("/");
  expect(
    screen.queryByRole("navigation", { name: "Documents navigation" })
  ).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Expand sidebar" }));
  const navigation = await screen.findByRole("navigation", {
    name: "Documents navigation",
  });
  expect(
    within(navigation).getByRole("button", { name: "Login" })
  ).toBeTruthy();
  expect(
    within(navigation).getByRole("button", { name: "Retry" })
  ).toBeEnabled();
  expect(within(navigation).getByRole("link", { name: "Search" })).toBeTruthy();
});
it("offers one sidebar toggle on the mobile public search page", async () => {
  mocks.mobile = true;
  renderPublic("/search?q=topic");
  await screen.findByRole("searchbox", { name: "Search" });
  expect(
    screen.getAllByRole("button", { name: "Expand sidebar" })
  ).toHaveLength(1);
});

it.each([
  "/",
  "/public/collection/collection-1",
  "/doc/welcome-1234567890",
  "/search?q=topic",
])(
  "gives the ready public scene exactly one mobile header at %s",
  async (path) => {
    mocks.mobile = true;
    renderPublic(path);
    const main = screen.getByRole("main");
    if (path.startsWith("/search")) {
      await within(main).findByRole("searchbox", { name: "Search" });
    } else {
      await waitFor(() =>
        expect(within(main).queryByRole("status")).toBeNull()
      );
    }
    await waitFor(() =>
      expect(
        screen.getAllByRole("button", { name: "Expand sidebar" })
      ).toHaveLength(1)
    );
    if (!path.startsWith("/search")) {
      expect(
        main.querySelectorAll("[data-public-reading-toolbar]")
      ).toHaveLength(1);
    }
  }
);

it.each([
  "configuration-loading",
  "configuration-error",
  "not-initialized",
  "document-error",
  "document-unavailable",
  "collection-error",
])("keeps one safe header during %s", async (phase) => {
  mocks.mobile = true;
  let path = "/doc/welcome-1234567890";
  if (phase.startsWith("configuration")) {
    mocks.auth.config = undefined;
    mocks.auth.fetchConfig.mockImplementation(() =>
      phase === "configuration-loading"
        ? new Promise(() => {})
        : Promise.reject(new Error("unavailable"))
    );
  } else if (phase === "not-initialized") {
    if (mocks.auth.config) {
      mocks.auth.config.initialized = false;
    }
    mocks.auth.websiteIntegrationInitialized = false;
  } else {
    if (phase === "collection-error") {
      path = "/public/collection/collection-1";
    }
    mocks.fetch.mockRejectedValue(
      phase === "document-unavailable"
        ? new NotFoundError()
        : new Error("unavailable")
    );
  }
  renderPublic(path);
  await within(screen.getByRole("main")).findByRole(
    phase === "configuration-loading" ? "status" : "alert"
  );
  expect(
    screen.getAllByRole("button", { name: "Expand sidebar" })
  ).toHaveLength(1);
  expect(screen.queryByRole("button", { name: "Contents" })).toBeNull();
  expect(screen.queryByText("Welcome")).toBeNull();
  const main = screen.getByRole("main");
  expect(main.querySelectorAll("[data-public-reading-toolbar]")).toHaveLength(
    1
  );
});

it("places document navigation outside the article and shows only the public document as current", async () => {
  renderPublic(info.url);
  await screen.findByRole("heading", { name: info.title });
  const main = screen.getByRole("main");
  const toolbar = main.querySelector("[data-public-reading-toolbar]");
  expect(toolbar?.closest("article")).toBeNull();
  expect(toolbar).toHaveTextContent(collection.name);
  const navigation = screen.getByRole("navigation", {
    name: "Documents navigation",
  });
  await within(navigation).findByRole("link", { name: info.title });
  expect(navigation.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
  expect(
    within(navigation).getByRole("link", { name: collection.name })
  ).not.toHaveAttribute("aria-current");
  await waitFor(() =>
    expect(main.querySelector("time")).toHaveAttribute(
      "datetime",
      info.updatedAt
    )
  );
});

it("omits invalid public update metadata", async () => {
  mocks.fetch.mockImplementation((path) =>
    Promise.resolve(
      path === "/public.documents.info"
        ? { data: { ...info, updatedAt: "invalid" } }
        : path === "/public.collections.list"
          ? page([collection])
          : page([doc])
    )
  );
  renderPublic(info.url);
  await screen.findByRole("heading", { name: info.title });
  expect(screen.getByRole("article").querySelector("time")).toBeNull();
});

it("renders collection Markdown through the public read-only editor and lists only roots", async () => {
  mocks.fetch.mockImplementation((path) =>
    Promise.resolve(
      path === "/public.collections.list"
        ? page([
            {
              ...collection,
              description: "**Public guide** [Link](https://example.test)",
            },
          ])
        : page([
            doc,
            {
              ...doc,
              id: "child",
              title: "Nested only",
              url: "/doc/nested",
              parentDocumentId: doc.id,
            },
          ])
    )
  );
  renderPublic(collection.url);
  const main = screen.getByRole("main");
  const description = await within(main).findByTestId("reader");
  expect(description).toHaveAttribute("data-public", "true");
  expect(description).toHaveAttribute("data-readonly", "true");
  expect(description).toHaveTextContent("**Public guide**");
  expect(
    await within(main).findByRole("link", { name: info.title })
  ).toBeTruthy();
  expect(within(main).queryByRole("link", { name: "Nested only" })).toBeNull();
  expect(within(main).getByRole("link", { name: "Search" })).toHaveAttribute(
    "href",
    "/search?collectionId=collection-1"
  );
  expect(
    mocks.fetch.mock.calls.every(([path]) => path.startsWith("/public."))
  ).toBe(true);
  expect(mocks.post).not.toHaveBeenCalled();
});

it("omits an empty collection description", async () => {
  mocks.fetch.mockImplementation((path) =>
    Promise.resolve(
      path === "/public.collections.list"
        ? page([{ ...collection, description: "  " }])
        : page([])
    )
  );
  renderPublic(collection.url);
  const main = screen.getByRole("main");
  await within(main).findByText("This collection has no public documents.");
  expect(within(main).queryByTestId("reader")).toBeNull();
});

it("reacts to nested public document disclosures without navigating", async () => {
  mocks.fetch.mockImplementation((path) =>
    Promise.resolve(
      path === "/public.documents.info"
        ? { data: info }
        : path === "/public.collections.list"
          ? page([collection])
          : page([
              doc,
              {
                ...doc,
                id: "nested",
                title: "Nested guide",
                url: "/doc/nested",
                parentDocumentId: doc.id,
              },
              {
                ...doc,
                id: "deep",
                title: "Deep guide",
                url: "/doc/deep",
                parentDocumentId: "nested",
              },
            ])
    )
  );
  renderPublic(info.url);
  const nav = screen.getByRole("navigation", { name: "Documents navigation" });
  fireEvent.click(
    await within(nav).findByRole("button", { name: `Expand ${doc.title}` })
  );
  fireEvent.click(
    await within(nav).findByRole("button", { name: "Expand Nested guide" })
  );
  expect(
    await within(nav).findByRole("link", { name: "Deep guide" })
  ).toBeVisible();
  expect(screen.getByTestId("reading-location")).toHaveTextContent(info.url);
  fireEvent.click(
    within(nav).getByRole("button", { name: "Collapse Nested guide" })
  );
  expect(within(nav).queryByRole("link", { name: "Deep guide" })).toBeNull();
});

it("escapes collection summaries and preserves overview pagination", async () => {
  let reads = 0;
  mocks.fetch.mockImplementation(() =>
    Promise.resolve(
      ++reads === 1
        ? page(
            [{ ...collection, description: '<img src=x onerror="alert(1)">' }],
            0,
            true
          )
        : page(
            [
              {
                ...collection,
                id: "second",
                name: "Second",
                url: "/public/collection/second",
              },
            ],
            1
          )
    )
  );
  renderPublic("/");
  const main = screen.getByRole("main");
  await within(main).findByRole("link", { name: collection.name });
  expect(main.querySelectorAll("li a")).toHaveLength(1);
  expect(main.querySelector("li img")).toBeNull();
  expect(main).toHaveTextContent('<img src=x onerror="alert(1)">');
  fireEvent.click(
    within(main).getByRole("button", { name: "More collections" })
  );
  await within(main).findByRole("link", { name: "Second" });
  expect(
    within(main).queryByRole("button", { name: "More collections" })
  ).toBeNull();
});

it("closes mobile contents on identity invalidation and initializes a fresh reader", async () => {
  mocks.mobile = true;
  mocks.editorHeadings = [
    { id: "overview", title: "Overview", level: 1, inTable: false },
  ];
  renderPublic(info.url);
  fireEvent.click(await screen.findByRole("button", { name: "Contents" }));
  await screen.findByRole("dialog");
  mocks.editorHeadings = [];
  act(() => mocks.store?.invalidate());
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  await screen.findByRole("heading", { name: info.title });
  expect(screen.queryByRole("button", { name: "Contents" })).toBeNull();
});
