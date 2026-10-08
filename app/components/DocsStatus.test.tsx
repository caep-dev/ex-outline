import { fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { renderWithTheme } from "~/test/renderWithTheme";
import { DocsStatus } from "./DocsStatus";

describe("DocsStatus", () => {
  it("announces loading once without a duplicate heading or actions", () => {
    const { getByRole, getAllByText, queryByRole } = renderWithTheme(
      <DocsStatus state="loading" title="Loading" content="Loading" />
    );
    expect(getByRole("status")).toHaveAttribute("aria-busy", "true");
    expect(getAllByText("Loading")).toHaveLength(1);
    expect(queryByRole("heading")).not.toBeInTheDocument();
    expect(queryByRole("button")).not.toBeInTheDocument();
  });

  it("offers only a home link for a missing page, even when retry is supplied", () => {
    const retry = vi.fn();
    const { getByRole, queryByRole } = renderWithTheme(
      <MemoryRouter>
        <DocsStatus
          state="not-found"
          title="Not found"
          content="The link may be incorrect."
          homeTo="/"
          onRetry={retry}
        />
      </MemoryRouter>
    );
    expect(getByRole("alert")).toHaveTextContent("The link may be incorrect.");
    expect(getByRole("link", { name: "Back to home" })).toHaveAttribute(
      "href",
      "/"
    );
    expect(queryByRole("button")).not.toBeInTheDocument();
    expect(queryByRole("link", { name: /search/i })).not.toBeInTheDocument();
    expect(retry).not.toHaveBeenCalled();
  });

  it("shows an error reason and a retry action without leaking stale content", () => {
    const retry = vi.fn();
    const { getByRole, queryByText } = renderWithTheme(
      <DocsStatus
        state="error"
        title="Documents unavailable"
        content="Please try again."
        onRetry={retry}
      />
    );
    expect(getByRole("alert")).toHaveTextContent("Please try again.");
    expect(queryByText("Old private title")).not.toBeInTheDocument();
    fireEvent.click(getByRole("button", { name: "Retry" }));
    expect(retry).toHaveBeenCalledOnce();
  });
});
