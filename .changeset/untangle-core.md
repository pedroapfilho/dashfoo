---
"@dashfoo/core": major
---

Docking lives in one place. The zone geometry, drop intents and drag machine sit together in `dock/`, and the dock location enum joins the model, so imports run one way: model, then state, then dock. `DragSubject` and `DropIntent` belong to the drop-intent module instead of the drag machine and the actions. Public names are unchanged except:

- `splitEdge`, `BandOptions`, `edgeSchema` and `Edge` are removed. `resolveDockTarget(pointer, rect)` and `dockZonePolygons(rect)` always use the 22% band, so a painted zone map can't disagree with live drops.
- `collectTabsetsInRow(row)` returns the tabsets instead of filling an array you pass in.
- `findTabsetParent` also returns the `tabset` it found.
- New `DEFAULT_FLOAT_NAME` (`"Panel"`) and `DEFAULT_FLOAT_GEOMETRY`. Docking names new floats from the first, and `@dashfoo/react` reads both, so the default title and size each have one definition.
- `fromJSON` validates the parsed JSON once, through `dashfooSchema`.
- `DropResolution` carries the `indicator` (from `dropIndicator`) next to the `intent`, so whoever resolves a drop measures the tabset once and the indicator renders that result.

Fixed:

- `moveNode` that splits a one-tab tabset off its own tab is a no-op. Before, a direct dispatch moved the tab into a new tabset at half the weight and spent an undo step.
- `setMaximizedTabset` with a tabset that lives in a float is a no-op. Before, it cleared the current maximize.
- `dockFloat` with a `targetId` that is not in the main layout is a no-op. Before, it silently docked next to the active tabset.
