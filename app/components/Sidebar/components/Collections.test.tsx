import stores from "~/stores";
import { cleanup, fireEvent, waitFor, within } from "@testing-library/react";
import { Provider } from "mobx-react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { MemoryRouter } from "react-router-dom";
import Storage from "@shared/utils/Storage";
import { ActionContextProvider } from "~/hooks/useActionContext";
import { renderWithTheme } from "~/test/renderWithTheme";
import Collections from "./Collections";

vi.unmock("~/hooks/useActionContext");

async function renderCollections(canCreateCollection = true) {
  await stores.auth.fetchAuth();
  stores.auth.currentTeamId = "sidebar-team";
  stores.auth.add({ id: "sidebar-team", name: "Sidebar team" });
  stores.policies.add({
    id: "sidebar-team",
    abilities: { createCollection: canCreateCollection },
  });
  const result = renderWithTheme(
    <Provider rootStore={stores}>
      <MemoryRouter>
        <ActionContextProvider>
          <DndProvider backend={HTML5Backend}>
            <Collections />
          </DndProvider>
        </ActionContextProvider>
      </MemoryRouter>
    </Provider>
  );
  return { ...result, stores };
}

afterEach(() => {
  cleanup();
  stores.dialogs.closeAllModals();
  Storage.remove("sidebar-header-collections");
  Storage.remove("AUTH_STORE");
});

describe("collections sidebar section", () => {
  it("opens the existing create dialog from the title row", async () => {
    Storage.set("sidebar-header-collections", false);
    const { getByRole, stores } = await renderCollections();
    const heading = getByRole("heading", { name: /Collections/ });
    fireEvent.click(
      within(heading).getByRole("button", { name: "New collection" })
    );

    await waitFor(() => {
      const dialogs = Array.from(stores.dialogs.modalStack.values());
      expect(dialogs).toHaveLength(1);
      expect(dialogs[0].title).toBe("Create a collection");
      expect(dialogs[0].isOpen).toBe(true);
    });
  });

  it("hides the create control when the user cannot create collections", async () => {
    const { queryByRole } = await renderCollections(false);
    expect(queryByRole("button", { name: "New collection" })).toBeNull();
  });
});
