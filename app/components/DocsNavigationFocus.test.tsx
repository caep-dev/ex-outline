import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { observable, runInAction } from "mobx";
import { useState } from "react";
import { HelmetProvider } from "react-helmet-async";
import { Router, Link, Route } from "react-router-dom";
import type RootStore from "~/stores/RootStore";
import UiStore from "~/stores/UiStore";
import { renderWithTheme } from "~/test/renderWithTheme";
import history from "~/utils/history";
import { DocumentReadingFrame } from "~/scenes/Document/components/DocumentReadingFrame";
import { DocsLayout } from "./DocsLayout";
import { DocsStatus } from "./DocsStatus";
import { DocsNavigation } from "./Sidebar/DocsNavigation";

const mocks = vi.hoisted(() => ({
  auth: {
    websiteIntegrationEnabled: true,
    sessionGeneration: 1,
    authenticated: false,
  },
  ui: undefined as UiStore | undefined,
}));
vi.mock("~/utils/history", async () => ({
  default: (await import("history")).createMemoryHistory(),
}));
vi.mock("~/hooks/useStores", () => ({ default: () => mocks }));

beforeEach(() => {
  mocks.auth = observable({
    websiteIntegrationEnabled: true,
    sessionGeneration: 1,
    authenticated: false,
  });
  mocks.ui = new UiStore({} as RootStore);
  history.replace("/");
});

function Content() {
  const [status, setStatus] = useState<"loading" | "error" | "ready">(
    "loading"
  );
  return (
    <>
      <input aria-label="Draft query" />
      <button onClick={() => setStatus("error")}>Fail loading</button>
      <button onClick={() => setStatus("ready")}>Resolve content</button>
      {status === "ready" ? (
        <DocumentReadingFrame title="Loaded document" editor={<p>Body</p>} />
      ) : (
        <DocsStatus
          state={status}
          title="Document status"
          content="Safe reason"
        />
      )}
    </>
  );
}
function mount() {
  return renderWithTheme(
    <HelmetProvider>
      <Router history={history}>
        <DocsLayout
          sidebar={
            <>
              <DocsNavigation
                homePath="/"
                searchPath="/search"
                view={{ items: [], expandedIds: new Set() }}
                onToggle={() => {}}
              />
              <DocsStatus
                state="loading"
                title="Sidebar status"
                content="Side request"
              />
            </>
          }
        >
          <Route exact path="/">
            <DocumentReadingFrame
              title="Overview"
              editor={<Link to="/doc/guide-1234567890">Read guide</Link>}
            />
          </Route>
          <Route path="/search">
            <DocumentReadingFrame
              title="Search"
              editor={<input aria-label="Query" />}
            />
          </Route>
          <Route path="/doc/:slug">
            <Content />
          </Route>
        </DocsLayout>
      </Router>
    </HelmetProvider>
  );
}

it("focuses real route titles and visible loading/error/readiness, ignoring sidebar status", async () => {
  const user = userEvent.setup();
  mount();
  await waitFor(() =>
    expect(screen.getByRole("heading", { name: "Overview" })).toHaveFocus()
  );
  await user.click(screen.getByRole("link", { name: "Search" }));
  await waitFor(() =>
    expect(screen.getByRole("heading", { name: "Search" })).toHaveFocus()
  );
  await user.click(screen.getByRole("link", { name: "Home" }));
  await user.click(await screen.findByRole("link", { name: "Read guide" }));
  await waitFor(() =>
    expect(screen.getByText("Safe reason").parentElement).toHaveFocus()
  );
  await user.click(screen.getByRole("button", { name: "Fail loading" }));
  await waitFor(() => expect(screen.getByRole("alert")).toHaveFocus());
  await user.click(screen.getByRole("button", { name: "Resolve content" }));
  await waitFor(() =>
    expect(
      screen.getByRole("heading", { name: "Loaded document" })
    ).toHaveFocus()
  );
});

it("skips query typing, pagination/hash and ordinary rerenders but refocuses a new identity", async () => {
  history.replace("/search");
  mount();
  await waitFor(() =>
    expect(screen.getByRole("heading", { name: "Search" })).toHaveFocus()
  );
  const query = screen.getByRole("textbox", { name: "Query" });
  query.focus();
  fireEvent.change(query, { target: { value: "term" } });
  act(() => history.push("/search?q=term&offset=100#toc"));
  await new Promise((resolve) => requestAnimationFrame(resolve));
  expect(query).toHaveFocus();
  act(() =>
    runInAction(() => {
      mocks.auth.sessionGeneration += 1;
      mocks.auth.authenticated = true;
    })
  );
  await waitFor(() =>
    expect(screen.getByRole("heading", { name: "Search" })).toHaveFocus()
  );
});

it("waits for a visible target and leaves standalone focus unchanged", async () => {
  const { rerender } = renderWithTheme(
    <HelmetProvider>
      <Router history={history}>
        <DocsLayout>
          <h1 hidden>Hidden title</h1>
        </DocsLayout>
      </Router>
    </HelmetProvider>
  );
  await new Promise((resolve) => requestAnimationFrame(resolve));
  expect(screen.getByText("Hidden title")).not.toHaveFocus();
  rerender(
    <HelmetProvider>
      <Router history={history}>
        <DocsLayout>
          <h1>Ready title</h1>
        </DocsLayout>
      </Router>
    </HelmetProvider>
  );
  await waitFor(() => expect(screen.getByText("Ready title")).toHaveFocus());
  act(() =>
    runInAction(() => {
      mocks.auth.websiteIntegrationEnabled = false;
    })
  );
  const title = screen.getByText("Ready title");
  title.blur();
  act(() => history.push("/standalone"));
  await new Promise((resolve) => requestAnimationFrame(resolve));
  expect(title).not.toHaveFocus();
});
it("does not take focus from typing while a pending route becomes ready", async () => {
  history.replace("/doc/guide-1234567890");
  mount();
  await waitFor(() =>
    expect(screen.getByText("Safe reason").parentElement).toHaveFocus()
  );
  const query = screen.getByRole("textbox", { name: "Draft query" });
  query.focus();
  fireEvent.input(query, { target: { value: "typing" } });
  fireEvent.click(screen.getByRole("button", { name: "Resolve content" }));
  await screen.findByRole("heading", { name: "Loaded document" });
  await new Promise((resolve) => requestAnimationFrame(resolve));
  expect(query).toHaveFocus();
});
