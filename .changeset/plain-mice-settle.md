---
"@dashfoo/core": major
"@dashfoo/react": patch
---

Move the model invariants to the parse boundary: `weight` and `floats` are now always present on a parsed model, and `selected` is clamped where it is written.

`dashfooSchema` still accepts everything it accepted before. What changes is the shape it hands back:

- `floats` defaults to `[]`, so `Dashfoo.floats` is `FloatNode[]` rather than `FloatNode[] | undefined`. `normalize` no longer maps an emptied list back to `undefined`.
- `weight` defaults to `1` on rows and tabsets, so `RowNode.weight` and `TabsetNode.weight` are `number`.
- `tabsetNodeSchema` gained a transform that clamps `selected` into `[0, children.length - 1]`. It is a `ZodPipe` now, not a `ZodObject`, so `.pick()`/`.extend()` on it no longer compile. `tabsetNodeObjectSchema` is exported for that: the same object, before the transform.

If you construct models with the builders (`model`, `row`, `tabset`) nothing changes: they fill the same defaults, and `tabset()` now clamps the `selected` you pass it.

If you hold hand-written model literals typed as `Dashfoo`, they will stop compiling, because `weight` and `floats` are required in that type. Two ways out:

```ts
// 1. Parse it. Also gets you validation and the clamps.
import { parseModel } from "@dashfoo/core";
import type { DashfooInput } from "@dashfoo/core";

const stored: DashfooInput = { version: 1, global: {}, layout: { /* no weight needed */ } };
const model = parseModel(stored);

// 2. Keep the literal and add what the type now asks for.
const model: Dashfoo = { version: 1, global: {}, floats: [], layout: { …, weight: 1 } };
```

`DashfooInput` (`z.input<typeof dashfooSchema>`) is the loose input shape, exported so host-supplied or stored data has a type that does not demand the filled-in fields.

`weight`'s default is `1`, the value every reader already used for a missing weight (`row-view` summed `child.weight ?? 1`). `placeBesideTarget` was the one place that read a missing weight as `100`, which is why docking beside an unweighted target used to halve it to `50` and collapse its unweighted siblings to a sliver of the row. Nothing renders differently: a row whose children all omitted `weight` already split evenly, and every explicit weight is untouched.

`normalize` keeps the structural work (dropping empty tabsets and rows, collapsing single-child rows, healing `activeTabsetId`/`maximizedTabsetId`) and no longer re-walks the tree clamping `selected`. The actions that can push `selected` out of range clamp the tabset they touch instead: `selectTab`, `deleteTab`, `moveNode`, `floatTab`, `dockFloat`, and a `selected` written through `updateNodeAttributes`. The one behaviour this drops: a hand-written model with an out-of-range `selected`, passed straight to `model`/`defaultModel` without being parsed, is no longer silently repaired at mount.

Serialized output grows the filled-in fields, so `toJSON` now emits `"floats":[]` and a `"weight"` on every row and tabset. Stored payloads written by an older version still load: the schema fills in what they omit.

`DashfooMachineInput` is the new name for the XState input type previously exported as `DashfooInput` (`{ model: Dashfoo }`).

On the React side only fallbacks went away (`store.model.floats ?? []`, four `child.weight ?? 1` reads in `row-view`); no prop or hook signature changed.
