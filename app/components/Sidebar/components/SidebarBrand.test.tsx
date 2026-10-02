import { fireEvent } from "@testing-library/react";
import env from "~/env";
import { renderWithTheme } from "~/test/renderWithTheme";
import { SidebarBrand } from "./SidebarBrand";

const originalUrl = env.URL;

afterEach(() => {
  env.URL = originalUrl;
});

describe("SidebarBrand", () => {
  it("links the brand to the configured base URL", () => {
    env.URL = "https://example.com/docs";
    const { getByRole } = renderWithTheme(<SidebarBrand />);

    expect(getByRole("link", { name: "Exre Service" })).toHaveAttribute(
      "href",
      "https://example.com/docs"
    );
  });

  it("keeps the sidebar toggle outside the navigation link", () => {
    const handleToggle = vi.fn();
    const { getByRole } = renderWithTheme(
      <SidebarBrand>
        <button onClick={handleToggle}>Toggle sidebar</button>
      </SidebarBrand>
    );
    const toggle = getByRole("button", { name: "Toggle sidebar" });

    expect(toggle.closest("a")).toBeNull();
    fireEvent.click(toggle);
    expect(handleToggle).toHaveBeenCalledOnce();
  });
});
