import { fireEvent } from "@testing-library/react";
import { TOCPosition } from "@shared/types";
import { renderWithTheme } from "~/test/renderWithTheme";
import {
  DocumentReadingFrame,
  ReadingContentsView,
} from "./DocumentReadingFrame";

describe("DocumentReadingFrame", () => {
  it("keeps navigation controls out of the static reading surface", () => {
    const { getByRole, queryByRole, getByText } = renderWithTheme(
      <DocumentReadingFrame
        title="Guide"
        metadata={<time dateTime="2026-10-08">Updated today</time>}
        editor={<p>Body</p>}
        headings={[{ id: "install", level: 2, title: "Install" }]}
        navigateHeading={() => {}}
      />
    );
    expect(queryByRole("button")).toBeNull();
    expect(getByText("Updated today").parentElement).toBe(
      getByRole("heading", { name: "Guide" }).parentElement
    );
    expect(
      getByRole("navigation", { name: "Contents", hidden: true })
    ).toBeTruthy();
  });

  it("preserves a print-only list when desktop contents are closed", () => {
    const { container, queryByRole, getByRole } = renderWithTheme(
      <DocumentReadingFrame
        title="Guide"
        editor={<p>Body</p>}
        showContents={false}
        headings={[{ id: "install", level: 2, title: "Install" }]}
        navigateHeading={() => {}}
      />
    );
    expect(queryByRole("navigation", { name: "Contents" })).toBeNull();
    expect(container.querySelector("#docs-reading-contents")).toBeNull();
    expect(
      getByRole("link", { name: "Install", hidden: true }).closest(
        '[aria-hidden="true"]'
      )
    ).toBeTruthy();
  });

  it("does not render either contents list when there are no usable headings or TOC is disabled", () => {
    const view = renderWithTheme(
      <DocumentReadingFrame
        title="Guide"
        editor={<p>Body</p>}
        tocPosition={false}
        headings={[{ id: "install", level: 2, title: "Install" }]}
        navigateHeading={() => {}}
      />
    );
    expect(view.queryAllByRole("navigation", { hidden: true })).toHaveLength(0);
    view.unmount();
    const empty = renderWithTheme(
      <DocumentReadingFrame
        title="Guide"
        editor={<p>Body</p>}
        headings={[{ id: "deep", level: 5, title: "Deep" }]}
        navigateHeading={() => {}}
      />
    );
    expect(empty.queryAllByRole("navigation", { hidden: true })).toHaveLength(
      0
    );
  });

  it.each([
    { fullWidth: false, tocPosition: TOCPosition.Right },
    { fullWidth: true, tocPosition: TOCPosition.Left },
  ])(
    "keeps title typography and the editor in one reading column ($fullWidth / $tocPosition)",
    ({ fullWidth, tocPosition }) => {
      const { getByRole, getByText } = renderWithTheme(
        <DocumentReadingFrame
          title="Guide"
          editor={<p>Public body</p>}
          fullWidth={fullWidth}
          tocPosition={tocPosition}
        />
      );
      const title = getByRole("heading", { name: "Guide" });
      expect(title.parentElement).toBe(getByText("Public body").parentElement);
      expect(window.getComputedStyle(title).fontSize).toBe("2.25em");
      expect(window.getComputedStyle(title).marginTop).toBe("8vh");
    }
  );

  it("navigates headings and preserves modified link clicks", () => {
    const navigateHeading = vi.fn();
    const { getByRole } = renderWithTheme(
      <ReadingContentsView
        headings={[{ id: "install", level: 2, title: "Install" }]}
        navigateHeading={navigateHeading}
        mobileVisible
      />
    );
    const link = getByRole("link", { name: "Install" });
    expect(link).toHaveAttribute("href", "#install");
    fireEvent.click(link, { ctrlKey: true });
    expect(navigateHeading).not.toHaveBeenCalled();
    fireEvent.click(link);
    expect(navigateHeading).toHaveBeenCalledExactlyOnceWith("install");
  });
});
