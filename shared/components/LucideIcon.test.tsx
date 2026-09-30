// @vitest-environment jsdom
import { render, cleanup } from "@testing-library/react";
import { Search } from "lucide-react";
import { createRef } from "react";
import { describe, it, expect, afterEach } from "vitest";
import {
  LucideIcon,
  ArchiveIcon,
  CollectionIcon,
  DocumentIcon,
  DoneIcon,
  StarredIcon,
  UnstarredIcon,
  TrashIcon,
} from "./LucideIcon";

afterEach(cleanup);

describe("LucideIcon", () => {
  it("preserves SVG refs, sizes and inherited colors for interactive controls", () => {
    const ref = createRef<SVGSVGElement>();
    const { container } = render(
      <LucideIcon icon={Search} ref={ref} size={18} className="control-icon" />
    );
    const svg = container.querySelector("svg");

    expect(ref.current).toBe(svg);
    expect(svg?.getAttribute("width")).toBe("18");
    expect(svg?.getAttribute("height")).toBe("18");
    expect(svg?.getAttribute("stroke")).toBe("currentColor");
    expect(svg?.getAttribute("fill")).toBe("none");
    expect(svg?.classList.contains("control-icon")).toBe(true);
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
  });

  it("keeps accessible names and explicit colors supplied by the control", () => {
    const { getByLabelText } = render(
      <LucideIcon icon={Search} aria-label="Search" color="#abcdef" />
    );
    const svg = getByLabelText("Search");

    expect(svg.getAttribute("stroke")).toBe("#abcdef");
    expect(svg.getAttribute("aria-hidden")).not.toBe("true");
  });

  it("changes the folder graphic when an interactive collection is expanded", () => {
    const { container, rerender } = render(<CollectionIcon />);
    expect(
      container.querySelector("svg")?.classList.contains("lucide-folder")
    ).toBe(true);

    rerender(<CollectionIcon expanded />);
    expect(
      container.querySelector("svg")?.classList.contains("lucide-folder-open")
    ).toBe(true);
    expect(container.querySelector("svg")?.hasAttribute("expanded")).toBe(
      false
    );
  });

  it("consumes legacy presentation flags without leaking them into SVG attributes", () => {
    const { container } = render(
      <>
        <DocumentIcon outline />
        <DoneIcon outline />
      </>
    );

    expect(container.querySelectorAll("svg")).toHaveLength(2);
    for (const svg of container.querySelectorAll("svg")) {
      expect(svg.hasAttribute("outline")).toBe(false);
      expect(svg.getAttribute("fill")).toBe("none");
    }
  });

  it("keeps selected and unselected stars visually distinguishable", () => {
    const { container } = render(
      <>
        <StarredIcon />
        <UnstarredIcon />
      </>
    );
    const stars = container.querySelectorAll("svg");

    expect(stars[0]?.getAttribute("fill")).toBe("currentColor");
    expect(stars[1]?.getAttribute("fill")).toBe("none");
  });

  it("keeps the explicit color of a selected star in its fill and stroke", () => {
    const { container } = render(<StarredIcon color="#efab12" />);
    const star = container.querySelector("svg");

    expect(star?.getAttribute("fill")).toBe("#efab12");
    expect(star?.getAttribute("stroke")).toBe("#efab12");
  });

  it.each([
    {
      Component: ArchiveIcon,
      closed: "lucide-archive",
      open: "lucide-archive-restore",
    },
  ])(
    "preserves the drag-target graphic for $closed controls",
    ({ Component, closed, open }) => {
      const { container, rerender } = render(<Component />);
      expect(container.querySelector("svg")?.classList.contains(closed)).toBe(
        true
      );

      rerender(<Component open />);
      expect(container.querySelector("svg")?.classList.contains(open)).toBe(
        true
      );
      expect(container.querySelector("svg")?.hasAttribute("open")).toBe(false);
    }
  );

  it("raises the trash lid when a document is dragged over the target", () => {
    const { container, rerender } = render(<TrashIcon />);
    const lid = container.querySelector("path:nth-last-child(2)");
    if (!lid) {
      throw new Error("The trash lid did not render.");
    }
    const closed = getComputedStyle(lid).transform;

    rerender(<TrashIcon open />);

    expect(getComputedStyle(lid).transform).not.toBe(closed);
    expect(container.querySelector("svg")?.hasAttribute("open")).toBe(false);
  });
});
