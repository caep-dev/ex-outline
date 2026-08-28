import { light } from "@shared/styles/theme";
import Toasts from "~/components/Toasts";
import { renderWithTheme } from "~/test/renderWithTheme";

const capturedToasterProps = vi.hoisted(() => ({
  value: undefined as
    | {
        toastOptions?: {
          style?: Record<string, string>;
        };
      }
    | undefined,
}));

vi.mock("sonner", () => ({
  Toaster: (props: { toastOptions?: Record<string, unknown> }) => {
    capturedToasterProps.value = props as never;
    return null;
  },
}));

vi.mock("~/hooks/useStores", () => ({
  default: () => ({ ui: { resolvedTheme: "light" } }),
}));

describe("Toasts", () => {
  it("binds the toast surface to the toast overlay tokens", () => {
    renderWithTheme(<Toasts />);

    const style = capturedToasterProps.value?.toastOptions?.style;
    expect(style).toBeDefined();
    expect(style?.background).toBe(light.exui.overlay.toast.background);
    expect(style?.color).toBe(light.exui.overlay.toast.foreground);
    expect(style?.border).toBe(`1px solid ${light.exui.overlay.toast.border}`);
    expect(style?.borderRadius).toBe(light.exui.overlay.toast.radius);
    expect(style?.fontFamily).toBe(light.exui.typography.fontFamily);
  });
});
