import { useEffect } from "react";
import type * as UrlHelpers from "~/utils/urls";
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Redirect, Route, useLocation } from "react-router-dom";
import { clearWebsiteOidcAttempt } from "~/utils/websiteOidcAttempt";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { renderWithTheme } from "~/test/renderWithTheme";
import {
  WebsiteIdentityController,
  useWebsiteIdentity,
} from "./WebsiteIdentityController";
import { NotFoundError } from "~/utils/errors";
import { HelmetProvider } from "react-helmet-async";
import { PublicDocsStore } from "~/stores/PublicDocsStore";
import UiStore from "~/stores/UiStore";
import type RootStore from "~/stores/RootStore";
const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
  redirect: vi.fn(),
  ui: undefined as UiStore | undefined,
  publicDocs: undefined as PublicDocsStore | undefined,
  auth: {
    authenticated: false,
    sessionGeneration: 1,
    isFetching: false,
    config: {},
    websiteIntegrationInitialized: true,
    integrationAuthUnavailable: false,
    fetchConfig: vi.fn(),
  },
}));
vi.mock("~/env", () => ({ default: { URL: "https://example.test/docs" } }));
vi.mock("~/stores", () => ({ default: {} }));
vi.mock("~/utils/history", async () => ({
  default: (await import("history")).createMemoryHistory(),
}));
vi.mock("~/hooks/useStores", () => ({ default: () => mocks }));
vi.mock("~/utils/ApiClient", () => ({ client: { fetch: mocks.fetch } }));
vi.mock("~/utils/urls", async (original) => ({
  ...(await original<typeof UrlHelpers>()),
  redirectTo: mocks.redirect,
}));
vi.mock("~/components/WebsiteSessionProbe", () => ({
  WebsiteSessionProbe: ({
    onStatus,
  }: {
    onStatus: (value: string) => void;
  }) => <button onClick={() => onStatus("active")}>Active probe</button>,
}));
function RouteState() {
  const location = useLocation<{ docsReadingResume?: boolean }>();
  const { finishReadingResume } = useWebsiteIdentity();
  useEffect(() => {
    if (location.state?.docsReadingResume) {
      finishReadingResume(true);
    }
  }, [location.state, finishReadingResume]);
  return (
    <>
      <p data-testid="path">{location.pathname + location.search}</p>
      {mocks.auth.authenticated && (
        <Route exact path="/">
          <Redirect to="/home" />
        </Route>
      )}
      <Route path="/doc/:slug">
        <p>Final reader</p>
      </Route>
    </>
  );
}
function mount() {
  return renderWithTheme(
    <HelmetProvider>
      <MemoryRouter
        initialEntries={["/?docsResume=%2Fdocs%2Fdoc%2Fhello-1234567890"]}
      >
        <WebsiteIdentityController>
          <RouteState />
        </WebsiteIdentityController>
      </MemoryRouter>
    </HelmetProvider>
  );
}
beforeEach(() => {
  clearWebsiteOidcAttempt();
  mocks.fetch.mockReset();
  mocks.redirect.mockReset();
  mocks.auth.authenticated = false;
  mocks.ui = new UiStore({} as RootStore);
  mocks.publicDocs = new PublicDocsStore();
});
afterEach(cleanup);
it("holds active probing until delayed public preflight settles and bridges the final reading target", async () => {
  let resolve!: (value: object) => void;
  mocks.fetch.mockReturnValue(
    new Promise((done) => {
      resolve = done;
    })
  );
  mount();
  expect(screen.queryByRole("button", { name: "Active probe" })).toBeNull();
  expect(screen.queryByText("Final reader")).toBeNull();
  expect(screen.getByRole("link", { name: "Exre Service" })).toBeVisible();
  expect(
    screen.getByRole("navigation", { name: "Documents navigation" })
  ).toBeVisible();
  expect(screen.getAllByRole("main")).toHaveLength(1);
  resolve({ data: { id: "public" } });
  await screen.findByText("Final reader");
  fireEvent.click(screen.getByRole("button", { name: "Active probe" }));
  expect(mocks.redirect).toHaveBeenCalledWith(
    expect.stringContaining("returnTo=%2Fdocs%2Fdoc%2Fhello-1234567890")
  );
  expect(screen.getByTestId("path").textContent).toBe("/doc/hello-1234567890");
});
it("overrides signed-in root home redirect and preserves the verified identity", async () => {
  mocks.auth.authenticated = true;
  mocks.fetch.mockResolvedValue({ data: { id: "public" } });
  mount();
  await screen.findByText("Final reader");
  expect(mocks.auth.authenticated).toBe(true);
  expect(mocks.redirect).not.toHaveBeenCalled();
});
it("shows a safe unavailable root result for a revoked reading target", async () => {
  mocks.fetch.mockRejectedValue(new NotFoundError());
  mount();
  await screen.findByRole("alert");
  expect(screen.queryByText("Final reader")).toBeNull();
  expect(screen.getByRole("alert").textContent).not.toContain(
    "hello-1234567890"
  );
});
it("offers retry for network failure and performs a fresh preflight", async () => {
  mocks.fetch
    .mockRejectedValueOnce(new Error("network"))
    .mockResolvedValue({ data: { id: "public" } });
  mount();
  fireEvent.click(await screen.findByRole("button", { name: "Retry" }));
  await screen.findByText("Final reader");
  await waitFor(() => expect(mocks.fetch).toHaveBeenCalledTimes(2));
});
