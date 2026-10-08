import { fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as React from "react";
import { createInstance } from "i18next";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter, Router, Route } from "react-router-dom";
import history from "~/utils/history";
import { renderWithTheme } from "~/test/renderWithTheme";
import { DocsNavigation } from "./DocsNavigation";

vi.mock("~/utils/history", async () => ({
  default: (await import("history")).createMemoryHistory(),
}));

describe("DocsNavigation", () => {
  it.each(["/search", "/doc/guide-1234567890"])(
    "returns to the overview on a mouse click from %s",
    async (path) => {
      history.replace(path);
      const user = userEvent.setup();
      const { getByRole, getByTestId, container } = renderWithTheme(
        <Router history={history}>
          <DocsNavigation
            homePath="/"
            searchPath="/search"
            view={{ items: [], expandedIds: new Set() }}
            onToggle={() => {}}
          />
          <Route
            render={({ location }) => (
              <p data-testid="path">{location.pathname}</p>
            )}
          />
          <Route exact path="/">
            <h1>Public overview</h1>
          </Route>
        </Router>
      );
      expect(getByRole("link", { name: "Home" })).not.toHaveAttribute(
        "aria-current"
      );
      await user.click(getByRole("link", { name: "Home" }));
      await vi.waitFor(() =>
        expect(getByTestId("path")).toHaveTextContent(/^\/$/)
      );
      expect(getByRole("heading", { name: "Public overview" })).toBeVisible();
      expect(container.querySelectorAll('[aria-current="page"]')).toHaveLength(
        1
      );
    }
  );
  it("starts loading an empty collection and can collapse or retry its status", async () => {
    const user = userEvent.setup();
    function LoadingNavigation() {
      const [expanded, setExpanded] = React.useState(false);
      const [failed, setFailed] = React.useState(false);
      return (
        <MemoryRouter>
          <DocsNavigation
            homePath="/"
            searchPath="/search"
            view={{
              items: [
                {
                  id: "one",
                  kind: "collection",
                  label: "Guides",
                  to: "/public/collection/one",
                  children: [],
                },
                {
                  id: "leaf",
                  kind: "document",
                  label: "Leaf",
                  to: "/doc/leaf",
                  children: [],
                },
              ],
              expandedIds: new Set(expanded ? ["one"] : []),
            }}
            onToggle={() => setExpanded((value) => !value)}
            renderCollectionStatus={() =>
              failed ? (
                <div role="alert">
                  Loading failed{" "}
                  <button onClick={() => setFailed(false)}>Retry</button>
                </div>
              ) : (
                <div role="status">
                  Loading documents{" "}
                  <button onClick={() => setFailed(true)}>
                    Simulate network failure
                  </button>
                </div>
              )
            }
          />
        </MemoryRouter>
      );
    }
    const { getByRole, queryByRole } = renderWithTheme(<LoadingNavigation />);
    expect(
      queryByRole("button", { name: "Expand Leaf" })
    ).not.toBeInTheDocument();
    expect(queryByRole("status")).not.toBeInTheDocument();
    const disclosure = getByRole("button", { name: "Expand Guides" });
    disclosure.focus();
    await user.keyboard("{Enter}");
    expect(getByRole("status")).toHaveTextContent("Loading documents");
    expect(getByRole("link", { name: "Guides" })).toHaveAttribute(
      "href",
      "/public/collection/one"
    );
    await user.click(getByRole("button", { name: "Collapse Guides" }));
    expect(queryByRole("status")).not.toBeInTheDocument();
    await user.click(getByRole("button", { name: "Expand Guides" }));
    await user.click(getByRole("button", { name: "Simulate network failure" }));
    expect(getByRole("alert")).toHaveTextContent("Loading failed");
    await user.click(getByRole("button", { name: "Retry" }));
    expect(queryByRole("alert")).not.toBeInTheDocument();
    expect(getByRole("status")).toHaveTextContent("Loading documents");
  });

  it("localizes collection expand and collapse labels in Chinese", async () => {
    const chinese = createInstance();
    await chinese.init({
      lng: "zh-CN",
      fallbackLng: false,
      resources: { "zh-CN": { translation: {} } },
    });
    function Navigation() {
      const [expanded, setExpanded] = React.useState(false);
      return (
        <MemoryRouter>
          <DocsNavigation
            homePath="/"
            searchPath="/search"
            view={{
              items: [
                {
                  id: "one",
                  kind: "collection",
                  label: "指南",
                  to: "/public/collection/one",
                  children: [
                    {
                      id: "two",
                      kind: "document",
                      label: "安装",
                      to: "/doc/install",
                      children: [],
                    },
                  ],
                },
              ],
              expandedIds: new Set(expanded ? ["one"] : []),
            }}
            onToggle={() => setExpanded((value) => !value)}
          />
        </MemoryRouter>
      );
    }
    const { getByRole } = renderWithTheme(
      <I18nextProvider i18n={chinese}>
        <Navigation />
      </I18nextProvider>
    );
    fireEvent.click(getByRole("button", { name: "展开 指南" }));
    expect(getByRole("button", { name: "折叠 指南" })).toHaveAttribute(
      "aria-expanded",
      "true"
    );
  });
  it("renders anonymous navigation and keeps disclosure separate from the link", () => {
    const onToggle = vi.fn();
    const { getByRole, queryByText } = renderWithTheme(
      <MemoryRouter initialEntries={["/public/collection/one"]}>
        <DocsNavigation
          homePath="/"
          searchPath="/search"
          view={{
            items: [
              {
                id: "one",
                kind: "collection",
                label: "Guides",
                to: "/public/collection/one",
                children: [
                  {
                    id: "two",
                    kind: "document",
                    label: "Getting started",
                    to: "/doc/start",
                    children: [],
                  },
                ],
              },
            ],
            activeCollectionId: "one",
            expandedIds: new Set<string>(),
          }}
          onToggle={onToggle}
          account={<button>Log in</button>}
        />
      </MemoryRouter>
    );

    expect(getByRole("link", { name: "Guides" })).toHaveAttribute(
      "aria-current",
      "page"
    );
    expect(queryByText("Getting started")).not.toBeInTheDocument();
    const disclosure = getByRole("button", { name: "Expand Guides" });
    fireEvent.click(disclosure);
    expect(onToggle).toHaveBeenCalledWith("one");
    expect(getByRole("button", { name: "Log in" })).toBeInTheDocument();
  });
});
