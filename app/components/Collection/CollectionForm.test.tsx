import "~/stores";
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { CollectionPermission } from "@shared/types";
import type Collection from "~/models/Collection";
import { renderWithTheme } from "~/test/renderWithTheme";
import { CollectionForm } from "./CollectionForm";

const mocks = vi.hoisted(() => ({
  auth: { websiteIntegrationEnabled: true },
}));

vi.mock("~/hooks/useStores", () => ({
  default: () => ({ auth: mocks.auth, collections: { orderedData: [] } }),
}));
vi.mock("~/hooks/useCurrentTeam", () => ({
  default: () => ({ sharing: false, commentingEnabled: true }),
}));
vi.mock("~/components/DialogContext", () => ({
  useDialogContext: () => ({ setAnimating: vi.fn() }),
}));
vi.mock("~/components/LazyLoad", () => ({
  createLazyComponent: () => ({ Component: () => null, preload: vi.fn() }),
}));

beforeEach(() => {
  mocks.auth.websiteIntegrationEnabled = true;
});
afterEach(() => cleanup());

it("creates integrated collections with private access and mandatory reader comments", async () => {
  const handleSubmit = vi.fn();
  renderWithTheme(<CollectionForm handleSubmit={handleSubmit} />);
  expect(screen.getByRole("combobox")).toBeDisabled();
  fireEvent.change(screen.getByRole("textbox", { name: "Name" }), {
    target: { value: "Integrated collection" },
  });
  fireEvent.click(screen.getByRole("button", { name: "Advanced options" }));
  const commenting = screen.getByRole("switch", { name: "Commenting" });
  expect(commenting).toBeChecked();
  expect(commenting).toBeDisabled();
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Create" })).toBeEnabled()
  );
  fireEvent.click(screen.getByRole("button", { name: "Create" }));
  await waitFor(() => expect(handleSubmit).toHaveBeenCalled());
  expect(handleSubmit.mock.calls[0][0]).toMatchObject({
    name: "Integrated collection",
    permission: null,
    commenting: true,
  });
});

it("keeps integrated edit submissions consistent with reader comments", async () => {
  const handleSubmit = vi.fn();
  const collection = {
    name: "Existing collection",
    icon: "collection",
    color: "#123456",
    permission: null,
    commenting: true,
    templateManagement: CollectionPermission.Admin,
  } as Collection;
  renderWithTheme(
    <CollectionForm collection={collection} handleSubmit={handleSubmit} />
  );
  expect(screen.queryByRole("combobox", { name: "Permission" })).toBeNull();
  expect(screen.getByRole("switch", { name: "Commenting" })).toBeDisabled();
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled()
  );
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  await waitFor(() => expect(handleSubmit).toHaveBeenCalled());
  expect(handleSubmit.mock.calls[0][0]).toMatchObject({
    permission: null,
    commenting: true,
  });
});

it("retains editable workspace permissions and optional comments in standalone mode", async () => {
  mocks.auth.websiteIntegrationEnabled = false;
  renderWithTheme(<CollectionForm handleSubmit={vi.fn()} />);
  expect(screen.getByRole("combobox")).toBeEnabled();
  fireEvent.click(screen.getByRole("button", { name: "Advanced options" }));
  expect(screen.getByRole("switch", { name: "Commenting" })).toBeEnabled();
});
