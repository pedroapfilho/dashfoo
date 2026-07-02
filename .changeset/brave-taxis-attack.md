---
"@dashfoo/react": minor
---

Tabsets now register as real dnd-kit `Droppable`s with a custom occlusion-aware collision detector (topmost `elementFromPoint` wins), replacing the hand-rolled tabset registry and per-move hit-test scan. The drop target is resolved by dnd-kit's collision pass, globally across every layer sharing one manager; each drag layer claims only its own targets, so cross-layer drops commit exactly once. Behavior is unchanged: floats still occlude docked tabsets, `editable`/self-drop gates still apply at drag time.
