---
"@dashfoo/core": minor
"@dashfoo/react": patch
---

Add `dockLocationFor(target)` and `splitEdge(location)` to the geometry module, so the structured `DockTarget` is flattened to a `DockLocation` in one place and parsed back in one place instead of being assembled with string concatenation and taken apart with `startsWith`. The serialized `DockLocation` values are unchanged.

`zoneRect` is now exhaustive over `DockLocation` rather than falling back to the input rect: a caller passing a location outside the enum, which TypeScript already rejects, now gets an error instead of a silent identity result.
