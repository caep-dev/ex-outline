import "~/stores";
import { cleanup, fireEvent } from "@testing-library/react";
import Storage from "@shared/utils/Storage";
import { renderWithTheme } from "~/test/renderWithTheme";
import Header from "./Header";

afterEach(() => {
  cleanup();
  Storage.remove("sidebar-header-collections");
  Storage.remove("sidebar-header-starred");
});

describe("sidebar section header", () => {
  it("keeps a non-collapsible section visible despite a saved collapsed state", () => {
    Storage.set("sidebar-header-collections", false);
    const { getByText, queryByRole } = renderWithTheme(
      <Header id="collections" title="Collections" collapsible={false}>
        <a href="/collection">Team knowledge</a>
      </Header>
    );

    expect(getByText("Team knowledge")).toBeVisible();
    fireEvent.click(getByText("Collections"));
    expect(getByText("Team knowledge")).toBeVisible();
    expect(queryByRole("button", { name: "Collections" })).toBeNull();
  });

  it("keeps other sections toggleable", () => {
    const { getByRole, queryByText } = renderWithTheme(
      <Header id="starred" title="Starred">
        <a href="/starred">Favorite document</a>
      </Header>
    );

    fireEvent.click(getByRole("button", { name: "Starred" }));
    expect(queryByText("Favorite document")).toBeNull();
    fireEvent.click(getByRole("button", { name: "Starred" }));
    expect(queryByText("Favorite document")).toBeVisible();
  });
});
