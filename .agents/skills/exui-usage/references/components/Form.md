# ExForm and composed forms

Use `ExForm` to render a typed field configuration, or `Form` with `FormItem` and `FormList` when the page needs custom composition. Both use one form instance and the same schema validation.

## Install and import

Install a schema implementation yourself. The examples use Zod; ExUI does not bundle Zod or export `z`:

```bash
pnpm add zod
```

```tsx
import { ExForm, Form, FormItem, FormList, FormErrorSummary, useForm, useFormContext, useWatch, useFieldArray } from "@exre/exui"
import { z } from "zod"
import "@exre/exui/style.css"
```

The public schema contract is Standard Schema V1. Zod 3.25.28 and 4.6.5 are the fixed versions in the isolated consumer gates; both exercise an async refinement through real Chromium invalid and parsed-submit interactions. No `react-hook-form`, `@hookform/resolvers`, or Standard Schema package installation is needed. Use ExUI's hooks and providers together; a consumer's own RHF instance cannot be passed as `form`.

## Configuration and composition

[Complete configured example](../../examples/form-configured.tsx) shows typed text, numeric-string and enum controls, with parsed output. [Complete composed example](../../examples/form-composed.tsx) shows a shared context, watched draft, object list and error summary.

An `ExForm` receives either `schema` plus `defaultValues`, or an existing `form` from `useForm`. With an existing instance, do not also pass `schema`, `defaultValues`, `mode` or `reValidateMode`. A `Form` and all of its `FormItem`/`FormList` children must use the same instance; one instance can connect to one mounted form.

Declare initialization schemas and step schemas outside render, or memoize them. Changing an initialization schema requires a new instance or React key. Fresh equivalent `fields`/`steps` arrays are supported; fresh schema objects change the validation definition. A new `defaultValues` object does not replace a draft: call `reset(newDefaults)` to establish a new baseline.

## Input, parsed output and controls

Nested objects use original paths, such as `profile.email`. Dynamic object rows use `contacts.${index}.email`, while React keys come from the list's stable `key`, not the index. After `move`, `insert` or `remove`, bind the field to the row's current `index`. Nested lists follow the same rule (`teams.${teamIndex}.members`); each list component or row component owns its own hook rather than calling hooks inside a loop. Configuration lists use `kind: "list"`, a complete `defaultItem` and relative `itemFields` paths, and may contain another list configuration.

`defaultValues`, paths, `getValues`, `setValue`, `useWatch` and control bindings follow schema **Input**. `onSubmit` receives successful full-schema **Output**. A numeric input uses a string draft (`control: "number"`); convert it in the schema. Parsing never writes transformed output back into the draft.

Built-in controls are `text`, `email`, `password`, `number`, `date`, `textarea`, `select`, `radio-group`, `checkbox`, `switch`, `checkbox-group`, `multi-select`, `select-or-input` and `files`. Enum options retain the path's literal values. Multiple selection needs a writable string array; `FormList` needs a writable object array and complete `defaultItem` values. Readonly model arrays use typed custom `render` and `setValue` instead. `required` marks the label and accessibility; validation rules come from the schema.

Custom `render` receives `{ field, state, accessibility }`. `field.value` is a readonly snapshot, `field.onChange(next)` accepts the path's Input value, and `field.onBlur`/`field.ref` attach to the real focusable element. Spread `accessibility` onto that element and render labels and issues when using `noStyle`. Do not replace bindings through `controlProps`.

## Steps and validation scopes

Each step declares stable `id`, `fields`, `validationSchema`, and optional `validationDependencies`. Its schema receives a projection at the original input paths. Supply a schema that accepts that projection and reuses the business rules; the library cannot safely derive a step schema by picking arbitrary transformed or refined full schemas. Future required fields do not block the current scope. The last step still parses the complete schema, including cross-field rules.

`trigger()` runs complete validation; `trigger(names)` only applies selected paths and current root issues. `validateScope(scope)` uses explicit scope rules. Local success does not declare the full form valid, and `clearErrors` does not mark it valid. `FormErrorSummary` shows field and root issues; field links focus registered, connected controls.

For localized display, `Form` and `ExForm` accept `formatIssue(message)` and `issueSeparator`. The formatter changes the rendered field errors and error summary only; `form.state.errors` retains the original schema or server message. This lets an application switch language without replacing the form instance or losing its draft. Pass a translated `title` to a composed `FormErrorSummary`. Configured `ExForm` also accepts `errorSummaryTitle`, `stepsAriaLabel`, `backLabel`, and `nextLabel`; its existing `submitLabel` and `resetLabel` cover the remaining footer buttons. Omitted labels retain their current defaults.

## Errors, submission and lifecycle

`setError` writes manual errors. Inside `onSubmit(output, context)`, use `context.setFieldError`/`context.setFormError` for server errors and pass `context.signal` to work that supports abort. `form.submit()` resolves with `submitted`, `invalid`, `failed` or `cancelled`; thrown execution failures also reach `onSubmitError`. Repeated in-flight submits share the attempt. State snapshots are readonly and `form.state` updates the owning component.

`reset` clears draft state and cancels pending work; `cancelPending` cancels work while keeping the draft. Unmount cancels and disconnects the owner. `clearOnDestroy` optionally resets afterward. A Dialog that stays mounted when closed should call `reset` or `cancelPending` in its close handler. Cancellation prevents stale UI writes and signals cooperative abort; it cannot undo an already sent server operation.

The `files` control keeps a memory-only `File[]`: choose, drop and paste append files, removal uses current position, and reset allows the same file to be selected again. File count, size and type rules belong in the schema; `accept` is a picker hint. For SSR, construct any schema that needs the `File` constructor only in the browser. The control itself can server-render an empty file list without browser globals.

Its `controlProps` can set `buttonLabel`, `formatFileSize(bytes)` and `removeFileLabel(file)` to localize the picker, rendered size, and accessible remove action. The callbacks affect presentation only; file validation and stored `File[]` values stay unchanged.

Layout uses `vertical`, `horizontal` or `inline`, container-based columns (1–4) and field `colSpan`. Use application CSS for surrounding page layout. Consult the installed public types for all props and [Field](Field.md) for the lower-level presentation primitives.
