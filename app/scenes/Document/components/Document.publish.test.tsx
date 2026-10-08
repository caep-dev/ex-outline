import {
  act,
  cleanup,
  fireEvent,
  screen,
  within,
} from "@testing-library/react";
import { observable, runInAction } from "mobx";
import type { ReactNode } from "react";
import { forwardRef } from "react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import Document from "~/models/Document";
import type DocumentsStore from "~/stores/DocumentsStore";
import { renderWithTheme } from "~/test/renderWithTheme";
import DocumentScene from "./Document";

const mocks = vi.hoisted(() => ({
  auth: { logoutPending: false, websiteIntegrationEnabled: false },
  editorPending: false,
  open: vi.fn(),
  save: vi.fn(),
}));
vi.mock("~/hooks/useStores", () => ({
  default: () => ({
    auth: mocks.auth,
    ui: {},
    dialogs: { openModal: mocks.open },
  }),
}));
vi.mock("~/hooks/useLocationSidebarContext", () => ({
  useLocationSidebarContext: () => undefined,
}));
vi.mock("../hooks/useDocumentSave", () => ({
  useDocumentSave: () => ({ onSave: mocks.save }),
}));
vi.mock("~/scenes/DocumentPublish", () => ({ default: () => null }));
vi.mock("~/components/DocumentExplorer/DocumentMove", () => ({
  default: () => null,
}));
vi.mock("~/components/PageTitle", () => ({ default: () => null }));
vi.mock("~/components/MeasuredContainer", () => ({
  MeasuredContainer: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
}));
vi.mock("./Header", () => ({ default: () => null }));
vi.mock("./SharedHeader", () => ({ default: () => null }));
vi.mock("./Contents", () => ({ default: () => null }));
vi.mock("./Editor", () => {
  const pending = new Promise<never>(() => {});
  return {
    default: forwardRef(() => {
      if (mocks.editorPending) {
        throw pending;
      }
      return null;
    }),
  };
});
vi.mock("./Notices", () => ({ default: () => null }));
vi.mock("./References", () => ({ default: () => null }));
vi.mock("./RevisionViewer", () => ({ default: () => null }));
afterEach(() => {
  cleanup();
  mocks.editorPending = false;
});

it("blocks the actual Ctrl/Cmd+Shift+P registration while pending and restores the publish modal after failure", () => {
  mocks.auth = observable({
    logoutPending: false,
    websiteIntegrationEnabled: false,
  });
  mocks.open.mockClear();
  mocks.save.mockClear();
  const draft = new Document({ title: "Draft" }, {} as DocumentsStore);
  renderWithTheme(
    <MemoryRouter>
      <DocumentScene
        document={draft}
        readOnly={false}
        abilities={{ update: true }}
      />
    </MemoryRouter>
  );
  const shortcut = () =>
    fireEvent.keyDown(window, {
      key: "P",
      ctrlKey: true,
      metaKey: true,
      shiftKey: true,
    });
  act(() =>
    runInAction(() => {
      mocks.auth.logoutPending = true;
    })
  );
  shortcut();
  expect(mocks.open).not.toHaveBeenCalled();
  expect(mocks.save).not.toHaveBeenCalled();
  act(() =>
    runInAction(() => {
      mocks.auth.logoutPending = false;
    })
  );
  shortcut();
  expect(mocks.open).toHaveBeenCalledOnce();
  expect(mocks.open).toHaveBeenCalledWith(
    expect.objectContaining({ title: "Publish document" })
  );
});
it.each([true, false])(
  "presents integrated Editor suspense status while preserving standalone (%s)",
  (integrated) => {
    mocks.auth.websiteIntegrationEnabled = integrated;
    mocks.editorPending = true;
    const document = new Document({ title: "Guide" }, {} as DocumentsStore);
    renderWithTheme(
      <MemoryRouter>
        <DocumentScene document={document} readOnly abilities={{}} />
      </MemoryRouter>
    );
    if (integrated) {
      const status = screen.getByRole("status");
      expect(
        within(status).getByRole("heading", { name: "Loading" })
      ).toBeVisible();
      expect(status).toHaveTextContent("Loading document");
      expect(status.querySelector("svg")).toBeVisible();
      expect(status).toHaveAttribute("aria-busy", "true");
    } else {
      expect(screen.queryByRole("status")).toBeNull();
    }
  }
);
