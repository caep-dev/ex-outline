import { fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { renderWithTheme } from "~/test/renderWithTheme";
import { DocsSearchForm, DocsSearchResults } from "./DocsSearch";

describe("DocsSearch", () => {
  it("keeps result metadata in an optional adapter slot", () => {
    const { getByRole, getByText } = renderWithTheme(
      <MemoryRouter>
        <DocsSearchResults
          results={[
            {
              id: "one",
              title: "Guide",
              to: "/doc/guide",
              excerpt: "Start here",
            },
          ]}
          renderMetadata={() => <span>Updated yesterday</span>}
        />
      </MemoryRouter>
    );
    expect(getByRole("link", { name: /Guide/ })).toHaveTextContent(
      "Start here"
    );
    expect(getByText("Updated yesterday")).toBeInTheDocument();
  });

  it("submits a trimmed query and renders only projected result fields", () => {
    const onSearch = vi.fn();
    const { getByRole, queryByText } = renderWithTheme(
      <MemoryRouter>
        <DocsSearchForm label="Search documents" query="" onSearch={onSearch} />
        <DocsSearchResults
          results={[
            {
              id: "one",
              title: "Guide",
              to: "/doc/guide",
              excerpt: "Start here",
            },
          ]}
        />
      </MemoryRouter>
    );
    fireEvent.change(getByRole("searchbox"), {
      target: { value: "  guide  " },
    });
    fireEvent.submit(getByRole("search"));
    expect(onSearch).toHaveBeenCalledWith("guide");
    expect(getByRole("link", { name: "Guide" })).toHaveAttribute(
      "href",
      "/doc/guide"
    );
    expect(queryByText("Start here")).toBeInTheDocument();
  });
});
