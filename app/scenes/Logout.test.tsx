// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Logout from "./Logout";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { renderWithTheme } from "~/test/renderWithTheme";
import UiStore from "~/stores/UiStore";
import { PublicDocsStore } from "~/stores/PublicDocsStore";
import type RootStore from "~/stores/RootStore";

const mocks = vi.hoisted(() => ({
  logout: vi.fn(),
  ui: undefined as UiStore | undefined,
  publicDocs: undefined as PublicDocsStore | undefined,
}));
vi.mock("~/stores", () => ({ default: {} }));
vi.mock("~/utils/history", async () => ({
  default: (await import("history")).createMemoryHistory(),
}));
vi.mock("~/hooks/useStores", () => ({
  default: () => ({
    auth: { websiteIntegrationEnabled: true, logout: mocks.logout },
    ui: mocks.ui,
    publicDocs: mocks.publicDocs,
  }),
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (value: string) => value,
    i18n: { language: "en_US" },
  }),
}));

afterEach(() => {
  cleanup();
  mocks.logout.mockReset();
});

describe("integrated sign-out page", () => {
  function mount() {
    mocks.ui = new UiStore({} as RootStore);
    mocks.publicDocs = new PublicDocsStore();
    return renderWithTheme(
      <HelmetProvider>
        <MemoryRouter>
          <Logout />
        </MemoryRouter>
      </HelmetProvider>
    );
  }
  it("keeps a pending sign out in one branded shell with visible loading presentation", () => {
    mocks.logout.mockReturnValue(new Promise(() => {}));
    mount();
    expect(screen.getAllByRole("main")).toHaveLength(1);
    expect(screen.getByRole("link", { name: "Exre Service" })).toBeVisible();
    expect(
      screen.getByRole("navigation", { name: "Documents navigation" })
    ).toBeVisible();
    const status = within(screen.getByRole("main")).getByRole("status");
    expect(
      within(status).getByRole("heading", { name: "Signing out…" })
    ).toBeVisible();
    expect(status.querySelector("svg")).toBeVisible();
    expect(status).toHaveAttribute("aria-busy", "true");
  });
  it("keeps a failed server revocation visible and allows retry", async () => {
    mocks.logout
      .mockRejectedValueOnce(new Error("503"))
      .mockResolvedValueOnce(undefined);
    mount();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Unable to sign out"
    );
    expect(mocks.logout).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("alert").querySelector("svg")).toBeVisible();
    expect(screen.getAllByRole("main")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => expect(mocks.logout).toHaveBeenCalledTimes(2));
  });
});
