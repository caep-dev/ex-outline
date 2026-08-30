import "@exre/exui-tokens/font.css";
import { vi } from "vitest";
import { initI18n } from "~/utils/i18n";

vi.mock("~/hooks/useActionContext", () => ({
  default: () => undefined,
}));

vi.mock("~/hooks/useWindowSize", () => ({
  default: () => ({ width: window.innerWidth, height: window.innerHeight }),
}));

vi.mock("~/utils/ApiClient");

initI18n();

document.documentElement.style.colorScheme = "light";
