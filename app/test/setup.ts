/* oxlint-disable */
import "@testing-library/jest-dom/vitest";
import "reflect-metadata";
import { vi } from "vitest";

// Component tests render controls outside of the application provider tree,
// so the action context resolves to "no context" and ActionButton falls back
// to rendering a native button.
vi.mock("~/hooks/useActionContext", () => ({
  default: () => undefined,
}));
// @ts-expect-error ts-migrate(7016) FIXME: Could not find a declaration file for module '../.... Remove this comment to see the full error message
import localStorage from "../../__mocks__/localStorage";
import { initI18n } from "../utils/i18n";

initI18n();

global.localStorage = localStorage;

class ResizeObserverMock {
  private callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }

  observe(target: Element) {
    // Radix uses the callback to sync placeholder/value text, invoke it once.
    this.callback(
      [{ target } as ResizeObserverEntry],
      this as unknown as ResizeObserver
    );
  }

  unobserve() {}
  disconnect() {}
}

global.ResizeObserver = ResizeObserverMock;

Element.prototype.scrollIntoView = vi.fn();

global.matchMedia = ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
})) as never;

vi.mock("~/utils/ApiClient");
