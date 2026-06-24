---
"@dashfoo/react": patch
---

Enlarge floating-panel resize hit areas. Edge bands are now 12px (was 6px) and
straddle the frame border evenly, and corners are 20px (was 14px), so the
side and bottom edges are far easier to grab with the mouse.

Fix a resize/move gesture that could lose its pointer on a fast drag and keep
following the cursor without the button held. A resize now captures the pointer
up front (so a fast drag never leaks events to the layout beneath), a move with
no button down ends the gesture, and an OS-cancelled drag reverts instead of
committing a half-finished rect.

Fix the drop indicator painting on top of floating panels: a drop aimed at a
docked tabset now renders behind the float layer (only a float's own indicator
sits above it).

Add `title` tooltips to the icon-only chrome buttons (float minimize / dock-back,
tabset move / maximize / float) so hovering reveals what each icon does.
