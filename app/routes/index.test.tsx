import { cleanup, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import { renderWithTheme } from "~/test/renderWithTheme";
import Routes from "./index";
import { NotFoundError } from "~/utils/errors";
import { HelmetProvider } from "react-helmet-async";
import UiStore from "~/stores/UiStore";
import { PublicDocsStore } from "~/stores/PublicDocsStore";
import type RootStore from "~/stores/RootStore";
const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
  ui: undefined as UiStore | undefined,
  publicDocs: undefined as PublicDocsStore | undefined,
}));
vi.mock("~/stores", () => ({ default: {} }));
vi.mock("~/utils/history", async () => ({
  default: (await import("history")).createMemoryHistory(),
}));
vi.mock("~/utils/ApiClient", () => ({ client: { fetch: mocks.fetch } }));
vi.mock("~/env", () => ({ default: { URL: "https://example.test/docs" } }));
vi.mock("~/hooks/useAutoRefresh", () => ({ default: () => {} }));
vi.mock("~/hooks/useStores", () => ({
  default: () => ({
    ui: mocks.ui,
    publicDocs: mocks.publicDocs,
    auth: {
      websiteIntegrationEnabled: true,
      authenticated: true,
      isFetching: false,
      sessionGeneration: 1,
      config: {},
      websiteIntegrationInitialized: true,
    },
  }),
}));

vi.mock("~/components/Authenticated", () => ({
  default: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock("./authenticated", () => ({ default: () => <p>Member routes</p> }));
vi.mock("~/scenes/WebsitePublic", () => ({
  default: ({ kind }: { kind: string }) => <p>Fresh public {kind}</p>,
}));
function State() {
  const location = useLocation();
  return <p data-testid="path">{location.pathname}</p>;
}
beforeEach(() => {
  mocks.ui = new UiStore({} as RootStore);
  mocks.publicDocs = new PublicDocsStore();
});
afterEach(() => {
  cleanup();
  mocks.fetch.mockReset();
});
it("uses the fresh public reader for a signed-in reading resume", async () => {
  mocks.fetch.mockResolvedValue({ data: { id: "public" } });
  renderWithTheme(
    <HelmetProvider>
      <MemoryRouter
        initialEntries={[
          {
            pathname: "/doc/hello-1234567890",
            state: { docsReadingResume: true },
          },
        ]}
      >
        <Routes />
      </MemoryRouter>
    </HelmetProvider>
  );
  await screen.findByText("Member routes");
  expect(mocks.fetch).toHaveBeenCalledWith("/public.documents.info", "POST", {
    id: "hello-1234567890",
  });
});
it("keeps no-return signed-in root home default", async () => {
  renderWithTheme(
    <HelmetProvider>
      <MemoryRouter>
        <Routes />
        <State />
      </MemoryRouter>
    </HelmetProvider>
  );
  await screen.findByText("Member routes");
  expect(screen.getByTestId("path").textContent).toBe("/home");
});
it("keeps resumed directory public even when there is a verified identity", async () => {
  renderWithTheme(
    <HelmetProvider>
      <MemoryRouter
        initialEntries={[
          { pathname: "/", state: { docsReadingDirectory: true } },
        ]}
      >
        <Routes />
      </MemoryRouter>
    </HelmetProvider>
  );
  await screen.findByText("Fresh public directory");
});

it("rechecks the actual final route and replaces a newly revoked document with a safe root message", async () => {
  mocks.fetch
    .mockResolvedValueOnce({
      data: { id: "public", title: "Original secret title" },
    })
    .mockRejectedValueOnce(new NotFoundError());
  renderWithTheme(
    <HelmetProvider>
      <MemoryRouter
        initialEntries={["/?docsResume=%2Fdocs%2Fdoc%2Fhello-1234567890"]}
      >
        <Routes />
        <State />
      </MemoryRouter>
    </HelmetProvider>
  );
  await screen.findByRole("alert");
  expect(mocks.fetch).toHaveBeenCalledTimes(2);
  expect(screen.getByTestId("path").textContent).toBe("/");
  expect(screen.queryByText("Original secret title")).toBeNull();
  expect(screen.queryByText("Member routes")).toBeNull();
});
