import { observer } from "mobx-react";
import { Toaster } from "sonner";
import styled, { useTheme } from "styled-components";
import useStores from "~/hooks/useStores";
import type { ResolvedTheme } from "~/stores/UiStore";

function Toasts() {
  const { ui } = useStores();
  const theme = useTheme();

  return (
    <StyledToaster
      // @ts-expect-error styled-components overrides sonner's theme prop with DefaultTheme
      theme={ui.resolvedTheme as ResolvedTheme}
      closeButton
      toastOptions={{
        duration: 5000,
        style: {
          color: theme.exui.overlay.toast.foreground,
          background: theme.exui.overlay.toast.background,
          border: `1px solid ${theme.exui.overlay.toast.border}`,
          borderRadius: theme.exui.overlay.toast.radius,
          boxShadow: theme.exui.overlay.toast.shadow,
          fontFamily: theme.exui.typography.fontFamily,
          fontSize: theme.exui.typography.smallFontSize,
        },
      }}
    />
  );
}

const StyledToaster = styled(Toaster)`
  [data-close-button] {
    cursor: var(--pointer);
    opacity: 0;
  }

  [data-sonner-toast][data-expanded="true"] {
    [data-close-button] {
      opacity: 1;
    }
  }
`;

export default observer(Toasts);
