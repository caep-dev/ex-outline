import { fireEvent } from "@testing-library/react";
import env from "~/env";
import { renderWithTheme } from "~/test/renderWithTheme";
import { SidebarBrand } from "./SidebarBrand";

const originalUrl = env.URL;
const originalWebsiteUrl = env.WEBSITE_URL;

afterEach(() => {
  env.URL = originalUrl;
  env.WEBSITE_URL = originalWebsiteUrl;
});

describe("SidebarBrand", () => {
  it("returns to Website rather than the Outline application base URL", () => {
    env.URL = "https://localhost:3100";
    env.WEBSITE_URL = "http://127.0.0.1:8080/";
    const { getByRole } = renderWithTheme(<SidebarBrand />);
    expect(getByRole("link", { name: "Exre Service" })).toHaveAttribute(
      "href",
      "http://127.0.0.1:8080/"
    );
  });

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
