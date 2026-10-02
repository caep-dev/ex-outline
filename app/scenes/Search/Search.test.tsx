import { cleanup, fireEvent, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HelmetProvider } from "react-helmet-async";
import { Router } from "react-router-dom";
import { createMemoryHistory } from "history";
import type { ReactNode } from "react";
import type { SearchResult } from "~/types";
import type { SearchParams } from "~/stores/DocumentsStore";
import { renderWithTheme } from "~/test/renderWithTheme";
import Search from "./Search";
import { CollectionSearchButton } from "~/scenes/Collection/components/SearchButton";

const search = vi
  .fn<(params: SearchParams) => Promise<SearchResult[]>>()
  .mockResolvedValue([]);
const recent = [
  {
    id: "recent-1",
    query: "recent guide",
    delete: vi.fn().mockResolvedValue(undefined),
  },
];
const stores = {
  auth: { user: undefined },
  documents: { search, get: () => undefined },
  searches: { add: vi.fn(), recent, fetchPage: vi.fn().mockResolvedValue([]) },
  collections: {
    orderedData: [
      {
        id: "collection-1",
        name: "Collection One",
        icon: "collection",
        color: null,
        isPrivate: false,
      },
    ],
  },
  policies: { abilities: () => ({ update: false }) },
  ui: {
    resolvedTheme: "light",
    enableProgressBar: vi.fn(),
    disableProgressBar: vi.fn(),
  },
};
vi.mock("~/hooks/useStores", () => ({
  default: () => stores,
}));
vi.mock("./components/UserFilter", () => ({ default: () => null }));

// Bulk-action dialogs are unrelated to submitting a search and require the app shell.
vi.mock("~/components/DocumentSelectionToolbar", () => ({
  default: () => null,
}));
vi.mock("~/components/DocumentListItem", () => ({ default: () => null }));
vi.mock("~/components/Scene", () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

function renderSearch(embedded = true, button = false) {
  const history = createMemoryHistory({
    initialEntries: [
      embedded ? "/collection/test/recent?tab=recent" : "/search?q=initial",
    ],
  });
  const onRequestClose = vi.fn();
  const result = renderWithTheme(
    <HelmetProvider>
      <Router history={history}>
        {button ? (
          <CollectionSearchButton collectionId="collection-1" />
        ) : (
          <Search
            embedded={embedded}
            initialCollectionId="collection-1"
            onRequestClose={onRequestClose}
          />
        )}
      </Router>
    </HelmetProvider>
  );
  return { ...result, history, search, onRequestClose };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  search.mockReset().mockResolvedValue([]);
});

describe("embedded search", () => {
  it("opens from a button, focuses the input, and returns focus on close", async () => {
    const { getByRole, findByRole, queryByRole, history } = renderSearch(
      true,
      true
    );
    const button = getByRole("button", { name: "Search in collection" });
    button.focus();
    fireEvent.click(button);
    const input = await findByRole("searchbox");
    await waitFor(() => expect(input).toHaveFocus());
    expect(getByRole("dialog", { name: "Search in collection" })).toHaveStyle({
      alignItems: "center",
    });
    fireEvent.keyDown(input, { key: "Escape" });
    await waitFor(() => expect(queryByRole("dialog")).not.toBeInTheDocument());
    await waitFor(() => expect(button).toHaveFocus());
    expect(history.location.search).toBe("?tab=recent");
  });

  it("clears the query when the search modal is reopened", async () => {
    const { getByRole, findByRole, queryByRole } = renderSearch(true, true);
    const button = getByRole("button", { name: "Search in collection" });
    fireEvent.click(button);
    const input = await findByRole("searchbox");
    fireEvent.change(input, { target: { value: "temporary query" } });
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.click(getByRole("button", { name: "Close" }));
    await waitFor(() => expect(queryByRole("dialog")).not.toBeInTheDocument());
    fireEvent.click(button);
    expect(await findByRole("searchbox")).toHaveValue("");
  });

  it("keeps the modal open when Escape is pressed during composition", async () => {
    const { getByRole, findByRole } = renderSearch(true, true);
    fireEvent.click(getByRole("button", { name: "Search in collection" }));
    const input = await findByRole("searchbox");
    fireEvent.keyDown(input, { key: "Escape", isComposing: true });
    expect(
      getByRole("dialog", { name: "Search in collection" })
    ).toBeInTheDocument();
  });

  it("runs recent queries inside the modal after clearing the collection filter", async () => {
    const user = userEvent.setup();
    const { getByRole, findByRole, history, search } = renderSearch();
    await user.click(getByRole("button", { name: "Collection One" }));
    await user.click(await findByRole("menuitem", { name: "Any collection" }));
    await user.click(await findByRole("link", { name: "recent guide" }));
    await waitFor(() =>
      expect(search).toHaveBeenLastCalledWith(
        expect.objectContaining({ query: "recent guide" })
      )
    );
    expect(getByRole("searchbox")).toHaveValue("recent guide");
    expect(history.location.pathname).toBe("/collection/test/recent");
    expect(history.location.search).toBe("?tab=recent");
  });

  it("shows search errors within the modal without navigating", async () => {
    search.mockRejectedValue(new Error("Search unavailable"));
    const { findByText, history } = renderSearch();
    expect(await findByText("Something went wrong")).toBeInTheDocument();
    expect(history.location.search).toBe("?tab=recent");
  });

  it("changes to all collections and sorts within the modal", async () => {
    const user = userEvent.setup();
    const { getByRole, findByRole, search, history } = renderSearch();
    const input = getByRole("searchbox");
    fireEvent.change(input, { target: { value: "guide" } });
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() =>
      expect(search).toHaveBeenCalledWith(
        expect.objectContaining({ query: "guide" })
      )
    );
    await user.click(getByRole("button", { name: "Collection One" }));
    const menu = await findByRole("menu");
    await user.click(
      within(menu).getByRole("menuitem", { name: "Any collection" })
    );
    await waitFor(() =>
      expect(search).toHaveBeenLastCalledWith(
        expect.objectContaining({
          query: "guide",
          filters: expect.not.arrayContaining([
            expect.objectContaining({ field: "collectionId" }),
          ]),
        })
      )
    );
    await user.click(getByRole("button", { name: "Relevance" }));
    await user.click(await findByRole("menuitem", { name: "Newest" }));
    await waitFor(() =>
      expect(search).toHaveBeenLastCalledWith(
        expect.objectContaining({
          query: "guide",
          sort: "createdAt",
          direction: "DESC",
        })
      )
    );
    expect(history.location.pathname).toBe("/collection/test/recent");
    expect(history.location.search).toBe("?tab=recent");
  });

  it("searches the initial collection without changing the current URL", async () => {
    const { getByRole, search, history } = renderSearch();
    const input = getByRole("searchbox");
    fireEvent.change(input, { target: { value: "中文文档" } });
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() =>
      expect(search).toHaveBeenCalledWith(
        expect.objectContaining({
          query: "中文文档",
          filters: expect.arrayContaining([
            { field: "collectionId", operator: "eq", value: "collection-1" },
          ]),
        })
      )
    );
    expect(history.location.pathname).toBe("/collection/test/recent");
    expect(history.location.search).toBe("?tab=recent");
  });

  it("ignores Enter while composing and closes through its caller on Escape", async () => {
    const { getByRole, history, search, onRequestClose } = renderSearch();
    await waitFor(() => expect(search).toHaveBeenCalled());
    search.mockClear();
    const input = getByRole("searchbox");
    fireEvent.change(input, { target: { value: "拼音" } });
    fireEvent.keyDown(input, { key: "Enter", isComposing: true });
    expect(search).not.toHaveBeenCalled();
    fireEvent.keyDown(input, { key: "Escape" });
    expect(onRequestClose).toHaveBeenCalled();
    expect(history.location.pathname).toBe("/collection/test/recent");
  });

  it("continues to store submitted queries in the URL on the search page", async () => {
    const { getByRole, search, history } = renderSearch(false);
    await waitFor(() =>
      expect(search).toHaveBeenCalledWith(
        expect.objectContaining({ query: "initial" })
      )
    );
    const input = getByRole("searchbox");
    fireEvent.change(input, { target: { value: "next" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(history.location.pathname).toBe("/search");
    expect(history.location.search).toBe("?q=next");
  });
});
