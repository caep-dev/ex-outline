# Sonner

## Import

```tsx
import { Toaster, toast } from "@exre/exui"
import "@exre/exui/style.css"
```

## Exports

- `Toaster`
- `toast`
- `ExMessageContext` and `ExMessage` (managed application notifications)

## Usage

Mount one `Toaster` in your application and trigger notifications through the root `toast` export. `toast` re-exports the same Sonner instance the `Toaster` renders, so the full Sonner method set works as Sonner documents it: call `toast(message, data?)` directly, or use `toast.success`, `toast.error`, `toast.warning`, `toast.info`, `toast.message`, `toast.loading`, `toast.promise`, `toast.custom`, and `toast.dismiss`.

```tsx
import { Toaster, toast } from "@exre/exui"
import "@exre/exui/style.css"

export function App() {
  return (
    <>
      <Toaster />
      <button onClick={() => toast.success("Saved")}>Save</button>
    </>
  )
}
```

To update a notification in place, keep the id returned by `toast` and pass it back; to close one, call `toast.dismiss(id)` (or `toast.dismiss()` with no argument to close all).

[完整示例：通知调用链](../../examples/sonner-notifications.tsx) covers triggering, updating, dismissing, and the theme priority in one runnable file.

Do not install `sonner` yourself. A separately installed copy is a different instance whose toasts never reach the ExUI `Toaster`; the failure is silent. The same boundary applies to the other implementation libraries bundled into `@exre/exui` — see [React setup](../react-setup.md).

## Managed notifications

Mount one `<ExMessageContext />` beside the app tree, then call `ExMessage.info`, `warn`, `error`, `success`, or `loading` from any module. The host renders the same bundled Toaster and follows the surrounding `ThemeProvider` when present. It takes `duration` (3000 ms by default), `placement` (`"top-right"` by default), and `maxCount` (3 by default). It does not wrap children or provide a React context value.

Ordinary methods return an ID that `ExMessage.dismiss(id)` closes. `loading` returns `onSuccess(content, options?)`, `onError(content, options?)`, and `dismiss()`; success or error updates the same notification. Loading stays visible until one of these methods is called unless its own `{ duration }` deadline is set. A deadline closes it without displaying an error. Per-message options contain only `{ duration }`. Late completion after dismissal, deadline, or capacity eviction does nothing.

Only messages created through `ExMessage` count toward `maxCount`; when full, the oldest managed one closes. Existing direct `toast` calls remain supported but bypass that managed capacity. Mount one notification host per application and call `ExMessage` only after it mounts. See the [managed notification example](../../examples/ex-message.tsx).

## Theme

The `Toaster` resolves its theme in this order:

1. An explicit `theme` prop on `<Toaster />` wins and stays fixed.
2. Without an explicit prop, the `Toaster` follows the surrounding ExUI `ThemeProvider`.
3. Without a provider, it falls back to `"system"` and still mounts without throwing.

Provider switches and OS color scheme changes are followed live. See [Theme usage](../theme-usage.md).

`ToasterProps` is Sonner's own: `position`, `duration`, `richColors`, `closeButton`, `toastOptions`, and the other props pass straight through to the underlying `Toaster`.

By default, the shared `Toaster` renders Lucide icons for success, info, warning, error, and loading. The icons use the theme's `--exui-feedback-*` and `--primary` colors, including their foreground values where applicable. Override those CSS variables to change their colors with the rest of the theme. A direct `<Toaster />` also accepts Sonner's `icons` prop to replace the defaults; `<ExMessageContext />` uses the shared defaults.
