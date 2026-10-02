import { render, unmountComponentAtNode } from "react-dom";
import { act } from "react-dom/test-utils";
import { ThemeProvider } from "styled-components";
import { afterEach, describe, expect, it, vi } from "vitest";
import GlobalStyles from "@shared/styles/globals";
import { buildLightTheme, buildDarkTheme } from "@shared/styles/theme";
import Input from "~/components/Input";
import Modal from "~/components/Modal";

let container: HTMLDivElement | undefined;

afterEach(() => {
  if (container) {
    act(() => {
      if (container) {
        unmountComponentAtNode(container);
      }
    });
    container.remove();
    container = undefined;
  }
});

for (const { name, theme } of [
  { name: "light", theme: buildLightTheme() },
  { name: "dark", theme: buildDarkTheme() },
]) {
  describe(`Modal focus ring in ${name}`, () => {
    it.each([false, true])(
      "keeps the focused field shadow inside clipping boundaries (fixed size: %s)",
      async (fixedSize) => {
        const root = document.createElement("div");
        container = root;
        document.body.append(root);
        act(() => {
          render(
            <ThemeProvider theme={theme}>
              <GlobalStyles />
              <Modal
                isOpen
                title="New collection"
                onRequestClose={vi.fn()}
                fixedSize={fixedSize}
                height={fixedSize ? 400 : undefined}
              >
                <p>
                  Collections are used to group documents and choose
                  permissions.
                </p>
                <Input label="Name" autoFocus />
                {fixedSize && (
                  <div style={{ height: 800 }}>Long form content</div>
                )}
              </Modal>
            </ThemeProvider>,
            root
          );
        });
        await document.fonts.ready;
        await expect.poll(() => document.activeElement?.tagName).toBe("INPUT");
        const input = document.querySelector("[role='dialog'] input");
        if (!input) {
          throw new Error("The name field did not render.");
        }
        const dialog = input.closest("[role='dialog']");
        await Promise.all(
          dialog
            ?.getAnimations({ subtree: true })
            .map((animation) => animation.finished) ?? []
        );

        let ringOwner: Element | null = input;
        while (ringOwner && getComputedStyle(ringOwner).boxShadow === "none") {
          ringOwner = ringOwner.parentElement;
        }
        if (!ringOwner) {
          throw new Error("The focused field has no visible focus shadow.");
        }
        const shadow = getComputedStyle(ringOwner).boxShadow;
        const lengths =
          shadow.match(/-?\d+(?:\.\d+)?px/g)?.map(Number.parseFloat) ?? [];
        const clearance = (lengths[2] ?? 0) / 2 + (lengths[3] ?? 0);
        expect(clearance).toBeGreaterThan(0);
        const bounds = ringOwner.getBoundingClientRect();
        const clippedSides: string[] = [];
        let scrollable = false;
        for (
          let ancestor = ringOwner.parentElement;
          ancestor;
          ancestor = ancestor.parentElement
        ) {
          const style = getComputedStyle(ancestor);
          const rect = ancestor.getBoundingClientRect();
          const left = rect.left + ancestor.clientLeft;
          const top = rect.top + ancestor.clientTop;
          const clips = /^(hidden|auto|scroll|clip)$/;
          if (clips.test(style.overflowX)) {
            if (bounds.left - clearance < left - 0.5) {
              clippedSides.push("left");
            }
            if (bounds.right + clearance > left + ancestor.clientWidth + 0.5) {
              clippedSides.push("right");
            }
          }
          if (clips.test(style.overflowY)) {
            if (bounds.top - clearance < top - 0.5) {
              clippedSides.push("top");
            }
            if (bounds.bottom + clearance > top + ancestor.clientHeight + 0.5) {
              clippedSides.push("bottom");
            }
          }
          if (
            /^(auto|scroll)$/.test(style.overflowY) &&
            ancestor.scrollHeight > ancestor.clientHeight
          ) {
            scrollable = true;
          }
        }
        expect(
          clippedSides,
          "The focus shadow must remain fully visible"
        ).toEqual([]);
        if (fixedSize) {
          expect(scrollable, "Long modal content must still scroll").toBe(true);
        }
      }
    );
  });
}
