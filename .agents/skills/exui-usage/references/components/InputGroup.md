# InputGroup

## Import

```tsx
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupText, InputGroupInput, InputGroupTextarea } from "@exre/exui"
import "@exre/exui/style.css"
```

## Exports

- `InputGroup`
- `InputGroupAddon`
- `InputGroupButton`
- `InputGroupText`
- `InputGroupInput`
- `InputGroupTextarea`

## Usage

`InputGroup` wraps an input or textarea with decorative or interactive segments that share its border and background.

```tsx
import { SearchIcon } from "lucide-react"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@exre/exui"
import "@exre/exui/style.css"

export function SearchField() {
  return (
    <InputGroup>
      <InputGroupAddon align="inline-start">
        <SearchIcon />
      </InputGroupAddon>
      <InputGroupInput placeholder="Search…" />
    </InputGroup>
  )
}
```

- `InputGroupAddon` accepts `align`: `"inline-start"` (default), `"inline-end"`, `"block-start"`, or `"block-end"`. Clicking an addon focuses the wrapped input.
- Put icons, `Kbd`, or `InputGroupText` (a muted text span) inside an addon for decoration.
- Put `InputGroupButton` inside an addon for actions; it takes the package button `variant` plus addon-specific `size` values (`"xs"` default, `"sm"`, `"icon-xs"`, `"icon-sm"`).
- `InputGroupInput` and `InputGroupTextarea` are the control variants; pass standard input props through them.

The group paints the shared background and the focus/invalid shadow. Inner controls stay transparent; set `aria-invalid` on the control to show the group-level invalid state. For a translucent input, use `<InputGroup glass>` and keep `glass` off `InputGroupInput` and `InputGroupTextarea`, whose public props are native control props. `InputGroupButton` separately inherits `glass` from `Button`. See [Glass material](../glass.md).

For advanced props, use the TypeScript types exposed by the package-root import.
