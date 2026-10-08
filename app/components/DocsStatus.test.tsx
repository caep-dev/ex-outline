import { fireEvent } from "@testing-library/react";
import { renderWithTheme } from "~/test/renderWithTheme";
import { DocsStatus } from "./DocsStatus";

describe("DocsStatus", () => {
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
