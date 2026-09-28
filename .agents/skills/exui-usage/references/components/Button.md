# Button

Use `Button` for standard actions and `ActionButton` for compact tool or command surfaces that need the same variants with a tighter radius.

## Import

```tsx
import { RefreshCwIcon } from "lucide-react"
import { Button, ActionButton } from "@exre/exui"
import "@exre/exui/style.css"
```

## Basic Usage

```tsx
<Button>Save changes</Button>
<Button variant="outline">Cancel</Button>
<Button variant="danger">Delete</Button>
```

## Variants

Use `variant` to communicate intent:

- `default`: primary action.
- `secondary`: lower-emphasis action.
- `outline`: neutral bordered action.
- `ghost`: icon buttons or low-emphasis toolbar actions.
- `danger`: destructive action with filled emphasis.
- `destructive`: destructive action with softer emphasis.
- `link`: inline text action.

## Sizes

Use `size="default"`, `xs`, `sm`, or `lg` for text buttons. Use `icon`, `icon-xs`, `icon-sm`, or `icon-lg` for icon-only buttons.

```tsx
import { RefreshCwIcon } from "lucide-react"

<Button size="sm">Invite</Button>
<Button size="icon" aria-label="Refresh">
  <RefreshCwIcon aria-hidden="true" />
</Button>
```

## asChild

Use `asChild` when the action should render as another element, such as a router link, while keeping button styling.

```tsx
<Button asChild>
  <a href="/settings">Open settings</a>
</Button>
```

## Guidance

Always provide accessible text. For icon-only buttons, use `aria-label` or an `sr-only` label. Keep destructive actions visually distinct with `danger` or `destructive`.

The package also exports `buttonVariants`, the style function behind these variants, for applying button styling to custom elements.

`Button` and `ActionButton` accept `glass?: boolean`. Combine it with the existing variant and size; danger and destructive variants keep their danger tone. The default button radius is the capsule Token, while `ActionButton` uses the independent `button.action.radius` recipe value (`0.75rem`). See [Glass material](../glass.md) for optional refraction and customization.
