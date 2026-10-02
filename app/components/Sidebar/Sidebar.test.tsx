// Match the application entry point's initialization order for the store cycle.
import "~/stores";
import { act, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { DirectionProvider } from "@radix-ui/react-direction";
import { Provider } from "mobx-react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import Header from "~/components/Header";
import Layout from "~/components/Layout";
import { SplitViewContext } from "~/components/SplitView/context";
import RootStore from "~/stores/RootStore";
import { renderWithTheme } from "~/test/renderWithTheme";
import Sidebar from "./Sidebar";

let isMobile = false;

vi.mock("~/hooks/useMobile", () => ({ default: () => isMobile }));
// Account controls load unrelated dialog/profile flows; these tests have no user.
vi.mock("~/menus/AccountMenu", () => ({ default: () => null }));
vi.mock("~/components/Notifications/NotificationsPopover", () => ({
  default: () => null,
}));
vi.mock("~/components/Avatar", () => ({ Avatar: () => null }));

function movePointer(clientX: number, buttons = 0, pointerType = "mouse") {
  const event = new MouseEvent("pointermove", {
    bubbles: true,
    clientX,
    clientY: 400,
    buttons,
  });
  Object.defineProperty(event, "pointerType", { value: pointerType });
  fireEvent(window, event);
}

function renderSidebar({
  canCollapse = true,
  direction = "ltr",
  secondaryPane = false,
}: {
  canCollapse?: boolean;
  direction?: "ltr" | "rtl";
  secondaryPane?: boolean;
} = {}) {
  const stores = new RootStore();
  stores.ui.collapseSidebar();
  const result = renderWithTheme(
    <Provider rootStore={stores}>
      <HelmetProvider>
        <MemoryRouter>
          <DirectionProvider dir={direction}>
            <Layout
              sidebarCanCollapse={canCollapse}
              sidebar={
                <Sidebar canCollapse={canCollapse} showAccountMenu={false}>
                  <div role="navigation" aria-label="Workspace">
                    <button>Sidebar action</button>
                  </div>
                </Sidebar>
              }
            >
              <SplitViewContext.Provider
                value={{
                  pane: secondaryPane ? "secondary" : "primary",
                  isSplitView: secondaryPane,
                  isFocused: true,
                }}
              >
                <Header hasSidebar title="Documents" />
              </SplitViewContext.Provider>
            </Layout>
          </DirectionProvider>
        </MemoryRouter>
      </HelmetProvider>
    </Provider>
  );
  return { ...result, stores };
}

beforeEach(() => {
  isMobile = false;
  localStorage.removeItem("UI_STORE");
  localStorage.removeItem("AUTH_STORE");
  vi.spyOn(document, "hasFocus").mockReturnValue(true);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("collapsed sidebar", () => {
  it("offers a header button that permanently expands the sidebar", () => {
    const { getByRole, stores } = renderSidebar();
    fireEvent.click(getByRole("button", { name: "Expand sidebar" }));
    expect(stores.ui.sidebarIsClosed).toBe(false);
    expect(getByRole("navigation", { name: "Workspace" })).toBeVisible();
  });

  it("keeps sidebar content inaccessible while collapsed", () => {
    const { queryByRole, container } = renderSidebar();
    expect(queryByRole("button", { name: "Sidebar action" })).toBeNull();
    expect(container.querySelector("#sidebar")).toHaveStyle({
      visibility: "hidden",
    });
    expect(container.querySelector("#sidebar")).toHaveAttribute("inert");
  });

  it("reveals an edge button but opens only after clicking it", () => {
    const { stores, getByRole, getAllByRole } = renderSidebar();
    const headerButton = getByRole("button", { name: "Expand sidebar" });
    movePointer(52);
    const edgeButton = getAllByRole("button", { name: "Expand sidebar" }).find(
      (button) => button !== headerButton
    );
    if (!edgeButton) {
      throw new Error("The edge button should appear near the sidebar edge.");
    }
    movePointer(36);
    movePointer(0);
    expect(stores.ui.sidebarIsClosed).toBe(true);
    fireEvent.pointerDown(edgeButton);
    expect(edgeButton).toBeEnabled();
    fireEvent.pointerUp(edgeButton);
    fireEvent.click(edgeButton);
    movePointer(300);
    expect(stores.ui.sidebarIsClosed).toBe(false);
    expect(getByRole("navigation", { name: "Workspace" })).toBeVisible();
  });

  it("hides the edge button when the pointer moves away", () => {
    const { getAllByRole, stores } = renderSidebar();
    movePointer(52);
    expect(getAllByRole("button", { name: "Expand sidebar" })).toHaveLength(2);
    movePointer(200);
    expect(getAllByRole("button", { name: "Expand sidebar" })).toHaveLength(1);
    expect(stores.ui.sidebarIsClosed).toBe(true);
  });

  it("ignores text selection and touch input", () => {
    const { stores, getAllByRole } = renderSidebar();
    movePointer(52, 1);
    movePointer(20, 1);
    movePointer(84, 0, "touch");
    movePointer(20, 0, "touch");
    expect(stores.ui.sidebarIsClosed).toBe(true);
    expect(getAllByRole("button", { name: "Expand sidebar" })).toHaveLength(1);
  });

  it("hides the edge button on window blur", () => {
    const { getAllByRole } = renderSidebar();
    movePointer(52);
    expect(getAllByRole("button", { name: "Expand sidebar" })).toHaveLength(2);
    fireEvent.blur(window);
    expect(getAllByRole("button", { name: "Expand sidebar" })).toHaveLength(1);
  });

  it("does not expand when the browser window is unfocused", () => {
    vi.spyOn(document, "hasFocus").mockReturnValue(false);
    const { stores } = renderSidebar();
    movePointer(84);
    movePointer(20);
    expect(stores.ui.sidebarIsClosed).toBe(true);
  });

  it("hides the edge button when the pointer exits the browser viewport", () => {
    const { getAllByRole } = renderSidebar();
    movePointer(52);
    expect(getAllByRole("button", { name: "Expand sidebar" })).toHaveLength(2);
    fireEvent(window, new MouseEvent("pointerout", { relatedTarget: null }));
    expect(getAllByRole("button", { name: "Expand sidebar" })).toHaveLength(1);
  });

  it("reveals the button at the inline-start edge in RTL without auto-opening", () => {
    const { stores, getAllByRole } = renderSidebar({ direction: "rtl" });
    movePointer(window.innerWidth - 52);
    expect(getAllByRole("button", { name: "Expand sidebar" })).toHaveLength(2);
    movePointer(window.innerWidth);
    expect(stores.ui.sidebarIsClosed).toBe(true);
  });

  it("disables desktop reopening for fixed sidebars", () => {
    const { queryByRole, stores } = renderSidebar({ canCollapse: false });
    expect(queryByRole("button", { name: "Expand sidebar" })).toBeNull();
    movePointer(84);
    movePointer(20);
    expect(stores.ui.sidebarIsClosed).toBe(true);
  });

  it("preserves the mobile menu without enabling the desktop edge button", () => {
    isMobile = true;
    const { getByRole, queryByRole, stores } = renderSidebar();
    expect(queryByRole("button", { name: "Expand sidebar" })).toBeNull();
    movePointer(84);
    movePointer(20);
    expect(stores.ui.sidebarIsClosed).toBe(true);
    fireEvent.click(getByRole("button"));
    expect(stores.ui.mobileSidebarVisible).toBe(true);
    expect(getByRole("navigation", { name: "Workspace" })).toBeVisible();
  });

  it("does not duplicate the reopen button in the secondary pane", () => {
    const { queryByRole } = renderSidebar({ secondaryPane: true });
    expect(queryByRole("button", { name: "Expand sidebar" })).toBeNull();
  });

  it("hides the header button from keyboard and screen readers after expanding", async () => {
    const { getByRole, queryByRole, stores } = renderSidebar();
    getByRole("button", { name: "Expand sidebar" });
    act(() => stores.ui.expandSidebar());
    await waitFor(() => {
      expect(queryByRole("button", { name: "Expand sidebar" })).toBeNull();
    });
  });
});
