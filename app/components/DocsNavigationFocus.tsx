import { useEffect, useRef, type RefObject } from "react";
import { observer } from "mobx-react";
import { useLocation } from "react-router-dom";
import useStores from "~/hooks/useStores";

/** Moves focus after integrated route changes, leaving initial page focus alone. */
export const DocsNavigationFocus = observer(function DocsNavigationFocus({
  layoutRef,
}: {
  layoutRef: RefObject<HTMLDivElement>;
}) {
  const { auth } = useStores();
  const { pathname } = useLocation();
  const enabled = auth.websiteIntegrationEnabled;
  const previousPathname = useRef(pathname);
  useEffect(() => {
    const root = layoutRef.current;
    const routeChanged = previousPathname.current !== pathname;
    previousPathname.current = pathname;
    if (!enabled || !root || !routeChanged) {
      return;
    }
    let complete = false;
    let lastTarget: HTMLElement | undefined;
    let lastState: string | null | undefined;
    let frame = 0;
    const focus = () => {
      if (complete) {
        return;
      }
      const main = root.querySelector('[role="main"]');
      const targets = main?.querySelectorAll<HTMLElement>(
        '[data-docs-focus], h1:not([data-docs-focus="false"]), [role="heading"][aria-level="1"]'
      );
      const target = Array.from(targets ?? []).find((element) => {
        for (
          let parent: HTMLElement | null = element;
          parent;
          parent = parent.parentElement
        ) {
          const style = window.getComputedStyle(parent);
          if (
            parent.hidden ||
            parent.hasAttribute("inert") ||
            parent.getAttribute("aria-hidden") === "true" ||
            style.display === "none" ||
            style.visibility === "hidden"
          ) {
            return false;
          }
        }
        return element.dataset.docsFocus !== "false";
      });
      if (!target) {
        return;
      }
      const state = target.getAttribute("data-docs-state");
      if (lastTarget !== target || lastState !== state) {
        target.tabIndex = -1;
        target.focus({ preventScroll: true });
        lastTarget = target;
        lastState = state;
      }
      complete = !state || state === "empty";
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(focus);
    };
    const changes = new MutationObserver(schedule);
    const handleTyping = (event: Event) => {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        target.closest('[role="main"]') &&
        target.matches(
          'input, textarea, [contenteditable="true"], [role="textbox"]'
        )
      ) {
        complete = true;
      }
    };
    changes.observe(root, { childList: true, subtree: true, attributes: true });
    root.addEventListener("input", handleTyping);
    schedule();
    return () => {
      changes.disconnect();
      root.removeEventListener("input", handleTyping);
      cancelAnimationFrame(frame);
    };
  }, [enabled, pathname, layoutRef]);
  return null;
});
