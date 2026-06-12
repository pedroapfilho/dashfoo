---
"@dashfoo/core": minor
---

Add `dockZonePolygons(rect, opts?)`: enumerates the full hit-region partition behind `resolveDockTarget` as five polygons (inner center rect + four edge trapezoids with diagonal seams). Shares the band default with `resolveDockTarget`, so a painted map always agrees with the live hit-test. New `DockZone` type exported.
