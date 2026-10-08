import { fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TOCPosition } from "@shared/types";
import { renderWithTheme } from "~/test/renderWithTheme";
import {
  DocumentReadingFrame,
  ReadingContentsView,
} from "./DocumentReadingFrame";

describe("DocumentReadingFrame", () => {
  it("offers one visible contents list with a keyboard toggle and heading selection", async () => {
    const user = userEvent.setup();
    const navigateHeading = vi.fn();
    const { getByRole, queryByRole, getAllByRole } = renderWithTheme(
      <DocumentReadingFrame
        title="Guide"
        editor={<p>Body</p>}
        headings={[
          { id: "install", level: 2, title: "Install" },
          { id: "linux", level: 3, title: "Linux" },
        ]}
        navigateHeading={navigateHeading}
      />
    );
    const toggle = getByRole("button", { name: "Contents" });
    expect(getAllByRole("navigation", { name: "Contents" })).toHaveLength(1);
    toggle.focus();
    await user.keyboard("{Enter}");
    expect(queryByRole("navigation", { name: "Contents" })).toBeNull();
    await user.keyboard("{Enter}");
    await user.click(getByRole("link", { name: "Linux" }));
    expect(navigateHeading).toHaveBeenCalledWith("linux");
    expect(toggle).toHaveAttribute("aria-expanded", "true");
  });
  it.each([
    { tocPosition: false as const, showContents: true },
    { tocPosition: TOCPosition.Right, showContents: false },
  ])(
    "does not mount contents when disabled by $tocPosition / $showContents",
    ({ tocPosition, showContents }) => {
      const { queryAllByRole, queryAllByText } = renderWithTheme(
        <DocumentReadingFrame
          title="Guide"
          editor={<p>Public body</p>}
          headings={[{ id: "install", level: 2, title: "Install" }]}
          navigateHeading={() => undefined}
          tocPosition={tocPosition}
          showContents={showContents}
        />
      );
      expect(queryAllByRole("navigation", { hidden: true })).toHaveLength(0);
      expect(queryAllByText("Install")).toHaveLength(0);
    }
  );

  it.each([
    { fullWidth: false, tocPosition: TOCPosition.Right },
    { fullWidth: true, tocPosition: TOCPosition.Left },
  ])(
    "keeps the title and editor in one reading column ($fullWidth / $tocPosition)",
    ({ fullWidth, tocPosition }) => {
      const { getByRole, getByText, getAllByRole } = renderWithTheme(
        <DocumentReadingFrame
          title="Guide"
          editor={<p>Public body</p>}
          fullWidth={fullWidth}
          tocPosition={tocPosition}
          headings={[{ id: "install", level: 2, title: "Install" }]}
          navigateHeading={() => undefined}
        />
      );
      const title = getByRole("heading", { name: "Guide" });
      expect(getAllByRole("heading", { name: "Guide" })).toHaveLength(1);
      expect(title.closest("header")?.parentElement).toBe(
        getByText("Public body").parentElement
      );
      expect(window.getComputedStyle(title).fontSize).toBe("2.25em");
      expect(window.getComputedStyle(title).marginTop).toBe("8vh");
    }
  );

  it("renders one read-only document title and body", () => {
    const navigateHeading = vi.fn();
    const { getByRole, queryByRole } = renderWithTheme(
      <DocumentReadingFrame
        title="Getting started"
        breadcrumb={<span>Guides</span>}
        editor={<p>Public body</p>}
        headings={[{ id: "install", level: 2, title: "Install" }]}
        navigateHeading={navigateHeading}
      />
    );

    expect(
      getByRole("heading", { name: "Getting started" })
    ).toBeInTheDocument();
    expect(getByRole("article")).toHaveTextContent("Public body");
    expect(queryByRole("button", { name: /save/i })).not.toBeInTheDocument();
  });

  it("navigates a heading from the shared contents view", () => {
    const navigateHeading = vi.fn();
    const { getByRole } = renderWithTheme(
      <ReadingContentsView
        headings={[{ id: "install", level: 2, title: "Install" }]}
        navigateHeading={navigateHeading}
      />
    );
    const link = getByRole("link", { name: "Install", hidden: true });
    expect(link).toHaveAttribute("href", "#install");
    fireEvent.click(link);
    expect(navigateHeading).toHaveBeenCalledWith("install");
  });
});
