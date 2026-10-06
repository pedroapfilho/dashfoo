---
"@dashfoo/react": patch
---

Drop intents and the dock indicator now come from one tab-strip measurement through `resolveDropIntent` and `dropIndicator` in `@dashfoo/core`, so the insertion index and the insertion line always mark the same slot. The index is measured against whole tab items (label plus close button), the item wrapper (`data-dashfoo="tab-item"`) carries `data-tab-id`, a layout nested in a tab no longer leaks its strip into the outer tabset's measurement, and only the layer that resolved a drop paints its indicator.
