import type * as UrlHelpers from "~/utils/urls";
import i18n from "i18next";
import en from "../../shared/i18n/locales/en_US/translation.json";
import zh from "../../shared/i18n/locales/zh_CN/translation.json";
// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter, Route } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthorizationError } from "~/utils/errors";
import WebsitePublic, { PublicDocumentView } from "./WebsitePublic";

const mocks = vi.hoisted(() => ({
  post: vi.fn(),
  redirect: vi.fn(),
  auth: {
    authenticated: false,
    isFetching: false,
    integrationAuthUnavailable: false,
    config: {
      websiteIntegrationEnabled: true,
      initialized: true,
      providers: [],
    },
    websiteIntegrationInitialized: true,
    fetchConfig: vi.fn(),
    fetchAuth: vi.fn(),
  },
}));

vi.mock("~/env", () => ({ default: { URL: "https://example.test/docs" } }));
vi.mock("~/hooks/useStores", () => ({ default: () => ({ auth: mocks.auth }) }));
vi.mock("~/utils/ApiClient", () => ({ client: { post: mocks.post } }));
vi.mock("~/utils/urls", async (importOriginal) => ({
  ...(await importOriginal<typeof UrlHelpers>()),
  redirectTo: mocks.redirect,
}));
vi.mock("~/components/WebsiteSessionProbe", () => ({
  WebsiteSessionProbe: ({
    onStatus,
  }: {
    onStatus: (status: "active") => void;
  }) => (
    <button data-testid="session-probe" onClick={() => onStatus("active")}>
      Probe session
    </button>
  ),
}));
vi.mock("~/components/Editor", () => ({
  default: ({ value }: { value: unknown }) => (
    <div data-testid="reader">{JSON.stringify(value)}</div>
  ),
}));

function renderPublic(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Route exact path="/" render={() => <WebsitePublic kind="directory" />} />
      <Route
        exact
        path="/public/collection/:collectionId"
        render={() => <WebsitePublic kind="directory" />}
      />
      <Route
        exact
        path="/doc/:documentSlug"
        render={() => <WebsitePublic kind="document" />}
      />
      <Route
        exact
        path="/search"
        render={() => <WebsitePublic kind="search" />}
      />
    </MemoryRouter>
  );
}

function renderPublicOnlyReader() {
  return render(
    <MemoryRouter initialEntries={["/doc/welcome-1234567890"]}>
      <Route
        path="/doc/:documentSlug"
        render={() => <PublicDocumentView allowComments />}
      />
    </MemoryRouter>
  );
}

beforeEach(() => {
  i18n
    .addResources("en-US", "translation", en)
    .addResources("zh-CN", "translation", zh);
  mocks.post.mockReset();
  mocks.redirect.mockReset();
  sessionStorage.clear();
  mocks.auth.authenticated = false;
  mocks.auth.fetchConfig.mockReset();
  mocks.auth.fetchAuth.mockReset();
  mocks.auth.integrationAuthUnavailable = false;
  mocks.auth.config.initialized = true;
  mocks.auth.websiteIntegrationInitialized = true;
});
afterEach(async () => {
  cleanup();
  await i18n.changeLanguage("en-US");
});

it("loads real Chinese public translations and returns to English without translating content", async () => {
  await i18n.changeLanguage("zh-CN");
  mocks.post.mockResolvedValue({
    data: [],
    pagination: { offset: 0, limit: 100, hasMore: false },
  });
  const view = renderPublic("/");
  expect(await screen.findByText("暂无文档集")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "登录" })).toBeInTheDocument();
  expect(
    screen.getByRole("navigation", { name: "文档导航" })
  ).toBeInTheDocument();
  mocks.auth.integrationAuthUnavailable = true;
  view.rerender(
    <MemoryRouter>
      <WebsitePublic kind="directory" />
    </MemoryRouter>
  );
  expect(
    await screen.findByText("登录状态暂时不可用，公开文档仍可阅读。")
  ).toBeInTheDocument();
  await i18n.changeLanguage("en-US");
  expect(
    await screen.findByRole("button", { name: "Login" })
  ).toBeInTheDocument();
  expect(
    screen.queryByText("登录状态暂时不可用，公开文档仍可阅读。")
  ).toBeNull();
  expect(
    screen.getByText(
      "Sign-in status is unavailable. Public documents remain available."
    )
  ).toBeInTheDocument();
});

describe("integrated public documents", () => {
  it("translates search empty, failure, retry, and empty results in Chinese", async () => {
    await i18n.changeLanguage("zh-CN");
    mocks.post
      .mockRejectedValueOnce(new Error("unavailable"))
      .mockResolvedValueOnce({
        data: [],
        pagination: { offset: 0, limit: 100, hasMore: false },
      });
    renderPublic("/search");
    expect(screen.getByText("请输入搜索词。")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: "搜索公开文档" }), {
      target: { value: "English content" },
    });
    fireEvent.click(screen.getByRole("button", { name: "搜索" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "文档暂时不可用。"
    );
    fireEvent.click(screen.getByRole("button", { name: "重试" }));
    expect(await screen.findByText("没有结果")).toBeInTheDocument();
    expect(mocks.post).toHaveBeenLastCalledWith("/public.documents.search", {
      query: "English content",
      offset: 0,
      limit: 100,
    });
  });

  it("keeps reader content intact while translating comment failures in Chinese", async () => {
    await i18n.changeLanguage("zh-CN");
    mocks.auth.authenticated = true;
    const content = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "English body" }],
        },
      ],
    };
    let listAttempts = 0;
    mocks.post.mockImplementation((path: string) => {
      if (path === "/public.documents.info") {
        return Promise.resolve({
          data: { id: "doc-1", title: "English title", content },
        });
      }
      if (path === "/comments.list") {
        listAttempts += 1;
        return listAttempts === 1
          ? Promise.reject(new Error("unavailable"))
          : Promise.resolve({
              data: [],
              pagination: { offset: 0, limit: 100, total: 0 },
            });
      }
      if (path === "/comments.create") {
        return Promise.reject(new Error("unavailable"));
      }
      throw new Error(`Unexpected RPC: ${path}`);
    });
    renderPublicOnlyReader();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "评论暂时不可用。"
    );
    expect(screen.getByRole("heading", { name: "English title" })).toBeTruthy();
    expect(screen.getByTestId("reader").textContent).toBe(
      JSON.stringify(content)
    );
    fireEvent.click(screen.getByRole("button", { name: "重试加载评论" }));
    const submit = screen.getByRole("button", { name: "发布" });
    await waitFor(() => expect(listAttempts).toBe(2));
    fireEvent.change(screen.getByRole("textbox", { name: "评论" }), {
      target: { value: "English comment" },
    });
    await waitFor(() => expect(submit).toBeEnabled());
    fireEvent.click(submit);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "评论提交失败，请重试。"
    );
    expect(screen.getByRole("textbox", { name: "评论" })).toHaveValue(
      "English comment"
    );
  });

  it("keeps public reading and explicit retry after a failed OIDC return without automatic redirection", async () => {
    mocks.post.mockResolvedValue({
      data: [],
      pagination: { offset: 0, limit: 100, hasMore: false },
    });
    const first = renderPublic("/?revision=1#website-signin-unavailable");
    fireEvent.click(screen.getByTestId("session-probe"));
    expect(mocks.redirect).not.toHaveBeenCalled();
    expect(
      await screen.findByText(
        "Sign-in status is unavailable. Public documents remain available."
      )
    ).toBeInTheDocument();
    first.unmount();
    renderPublic("/?revision=1#website-signin-unavailable");
    fireEvent.click(screen.getByTestId("session-probe"));
    expect(mocks.redirect).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Login" }));
    expect(mocks.redirect).toHaveBeenCalledTimes(1);
    expect(
      new URL(mocks.redirect.mock.calls[0][0]).searchParams.get("returnTo")
    ).toBe("/docs/?revision=1");
  });
  it("automatically restores a document once and blocks failed round trips and refreshes", async () => {
    mocks.post.mockResolvedValue({
      data: { title: "Welcome", content: {}, collection: { name: "Guides" } },
    });
    const first = renderPublic("/doc/welcome-1234567890?revision=1");
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
  it("lists only the public RPC projection and loads the selected collection", async () => {
    mocks.post.mockImplementation((path: string) =>
      path === "/public.collections.list"
        ? Promise.resolve({
            data: [
              {
                id: "collection-1",
                name: "Guides",
                description: null,
                url: "/public/collection/collection-1",
              },
            ],
            pagination: { offset: 0, limit: 100, hasMore: false },
          })
        : Promise.resolve({
            data: [
              {
                id: "doc-1",
                title: "Welcome",
                url: "/doc/welcome-1234567890",
                parentDocumentId: null,
                updatedAt: "2026-09-30",
              },
            ],
            pagination: { offset: 0, limit: 100, hasMore: false },
          })
    );
    renderPublic("/");
    expect(await screen.findByRole("link", { name: "Guides" })).toHaveAttribute(
      "href",
      "/public/collection/collection-1"
    );
    fireEvent.click(screen.getByRole("link", { name: "Guides" }));
    const document = await screen.findByRole("link", { name: "Welcome" });
    expect(document).toHaveAttribute(
      "href",
      "https://example.test/docs/doc/welcome-1234567890"
    );
    expect(mocks.post).toHaveBeenCalledWith("/public.documents.list", {
      collectionId: "collection-1",
      offset: 0,
      limit: 100,
    });
  });

  it("renders the public ProseMirror projection without flattening it", async () => {
    const content = {
      type: "doc",
      content: [
        {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: "Nested" }],
        },
      ],
    };
    mocks.post.mockResolvedValue({
      data: {
        id: "doc-1",
        collectionId: "collection-1",
        title: "Welcome",
        content,
        url: "/doc/welcome-1234567890",
        updatedAt: "2026-09-30",
      },
    });
    renderPublic("/doc/welcome-1234567890");
    expect(
      await screen.findByRole("heading", { name: "Welcome" })
    ).toBeTruthy();
    expect(screen.getByTestId("reader").textContent).toBe(
      JSON.stringify(content)
    );
    expect(mocks.post).toHaveBeenCalledWith("/public.documents.info", {
      id: "welcome-1234567890",
    });
  });

  it("lets a signed-in public-only reader view and post comments without private document RPCs", async () => {
    mocks.auth.authenticated = true;
    const document = {
      id: "doc-1",
      collectionId: "collection-1",
      title: "Welcome",
      content: {
        type: "doc",
        content: [
          { type: "paragraph", content: [{ type: "text", text: "Body" }] },
        ],
      },
      url: "/doc/welcome-1234567890",
      updatedAt: "2026-09-30",
    };
    let listCount = 0;
    mocks.post.mockImplementation((path: string) => {
      if (path === "/public.documents.info") {
        return Promise.resolve({ data: document });
      }
      if (path === "/comments.list") {
        listCount += 1;
        return Promise.resolve({
          data: [
            {
              id: "comment-1",
              data: {
                type: "doc",
                content: [
                  {
                    type: "paragraph",
                    content: [
                      {
                        type: "text",
                        text:
                          listCount === 1 ? "Existing comment" : "New comment",
                      },
                    ],
                  },
                ],
              },
              createdBy: { name: "Reader" },
            },
          ],
          pagination: { offset: 0, limit: 100, total: 1 },
        });
      }
      if (path === "/comments.create") {
        return Promise.resolve({ data: { id: "comment-2" } });
      }
      throw new Error(`Unexpected RPC: ${path}`);
    });
    renderPublicOnlyReader();
    expect(await screen.findByText("Existing comment")).toBeTruthy();
    fireEvent.change(screen.getByRole("textbox", { name: "Comment" }), {
      target: { value: "New comment" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Post" }));
    expect(await screen.findByText("New comment")).toBeTruthy();
    expect(mocks.post).toHaveBeenCalledWith("/comments.list", {
      documentId: "doc-1",
      limit: 100,
      offset: 0,
    });
    expect(mocks.post).toHaveBeenCalledWith("/comments.create", {
      documentId: "doc-1",
      text: "New comment",
    });
    expect(mocks.post.mock.calls.map(([path]) => path)).toEqual([
      "/public.documents.info",
      "/comments.list",
      "/comments.create",
      "/comments.list",
    ]);
    mocks.auth.authenticated = false;
  });

  it("paginates public-only comments beyond the first 100 without another private document request", async () => {
    mocks.auth.authenticated = true;
    const comment = (index: number) => ({
      id: `comment-${index}`,
      data: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [{ type: "text", text: `Comment ${index}` }],
          },
        ],
      },
      createdBy: { name: "Reader" },
    });
    mocks.post.mockImplementation((path: string, body: { offset?: number }) => {
      if (path === "/public.documents.info") {
        return Promise.resolve({
          data: { id: "doc-1", title: "Welcome", content: { type: "doc" } },
        });
      }
      if (path === "/comments.list") {
        const offset = body.offset ?? 0;
        return Promise.resolve({
          data:
            offset === 0
              ? Array.from({ length: 100 }, (_, index) => comment(index))
              : [comment(100)],
          pagination: { offset, limit: 100, total: 101 },
        });
      }
      throw new Error(`Unexpected RPC: ${path}`);
    });
    renderPublicOnlyReader();
    expect(await screen.findByText("Comment 99")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Load more comments" }));
    expect(await screen.findByText("Comment 100")).toBeTruthy();
    expect(screen.getAllByRole("listitem")).toHaveLength(101);
    expect(mocks.post).toHaveBeenCalledWith("/comments.list", {
      documentId: "doc-1",
      limit: 100,
      offset: 100,
    });
    expect(
      mocks.post.mock.calls.filter(
        ([path]) => path === "/public.documents.info"
      )
    ).toHaveLength(1);
  });

  it("hides a revoked public projection when comment access fails", async () => {
    mocks.auth.authenticated = true;
    mocks.post.mockImplementation((path: string) => {
      if (path === "/public.documents.info") {
        return mocks.post.mock.calls.filter(([name]) => name === path)
          .length === 1
          ? Promise.resolve({
              data: { id: "doc-1", title: "Welcome", content: { type: "doc" } },
            })
          : Promise.reject(new Error("not public"));
      }
      if (path === "/comments.list") {
        return Promise.reject(new AuthorizationError("revoked"));
      }
      throw new Error(`Unexpected RPC: ${path}`);
    });
    renderPublicOnlyReader();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "temporarily unavailable"
    );
    expect(screen.queryByRole("heading", { name: "Welcome" })).toBeNull();
    mocks.auth.authenticated = false;
  });

  it("keeps search failure visible and lets the visitor retry", async () => {
    mocks.post
      .mockRejectedValueOnce(new Error("unavailable"))
      .mockResolvedValueOnce({
        data: [
          {
            id: "doc-1",
            collectionId: "collection-1",
            title: "Result",
            url: "/doc/result-1234567890",
            excerpt: "Match",
          },
        ],
        pagination: { offset: 0, limit: 100, hasMore: false },
      });
    renderPublic("/search?q=topic");
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "temporarily unavailable"
    );
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByRole("link", { name: "Result" })).toHaveAttribute(
      "href",
      "https://example.test/docs/doc/result-1234567890"
    );
    await waitFor(() => expect(mocks.post).toHaveBeenCalledTimes(2));
  });

  it("keeps public reading available while session verification fails", async () => {
    mocks.auth.integrationAuthUnavailable = true;
    mocks.auth.fetchConfig.mockResolvedValue(undefined);
    mocks.auth.fetchAuth.mockRejectedValue(new Error("503"));
    mocks.post.mockResolvedValue({
      data: [],
      pagination: { offset: 0, limit: 100, hasMore: false },
    });
    renderPublic("/");
    expect(await screen.findByText("No collections")).toBeTruthy();
    expect(screen.queryByTestId("session-probe")).toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Public documents remain available"
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Retry sign-in status" })
    );
    expect(mocks.auth.fetchAuth).toHaveBeenCalledTimes(1);
  });

  it("does not start sign-in before the fixed workspace is initialized", () => {
    mocks.auth.config.initialized = false;
    mocks.auth.websiteIntegrationInitialized = false;
    renderPublic("/");
    expect(
      screen.getByText("The document library is not initialized yet.")
    ).toBeTruthy();
    expect(screen.queryByTestId("session-probe")).toBeNull();
    expect(screen.getByRole("button", { name: "Login" })).toBeDisabled();
    expect(mocks.post).not.toHaveBeenCalled();
  });
});
