import "~/stores";
import { Provider } from "mobx-react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import RootStore from "~/stores/RootStore";
import { renderWithTheme } from "~/test/renderWithTheme";
import { DocsLayout } from "./DocsLayout";

describe("DocsLayout", () => {
  it("renders one document shell without a current user or team", () => {
    const stores = new RootStore();
    const { getByRole, queryByRole } = renderWithTheme(
      <Provider rootStore={stores}>
        <HelmetProvider>
          <MemoryRouter>
            <DocsLayout
              title="Documents"
              sidebar={<nav aria-label="Documents">Directory</nav>}
            >
              <h1>Public documents</h1>
            </DocsLayout>
          </MemoryRouter>
        </HelmetProvider>
      </Provider>
    );

    expect(getByRole("main")).toHaveTextContent("Public documents");
    expect(getByRole("navigation", { name: "Documents" })).toHaveTextContent(
      "Directory"
    );
    expect(
      queryByRole("button", { name: /notifications/i })
    ).not.toBeInTheDocument();
  });
});
