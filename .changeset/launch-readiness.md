---
"@dashfoo/core": patch
"@dashfoo/react": patch
"@dashfoo/theme": patch
---

Prepare the early-adopter release: restore persistence after hydration, contain
storage failures, forward compound refs on React 18 and 19, and correct closable
tab accessibility. Panel bodies now provide a keyboard scroll target. The core
parseModel boundary accepts unknown input as documented.

Refresh examples, API guidance, the landing demo, and the hosted showcase. Add
standalone package consumers, browser and accessibility gates, and launch assets.

Improve the light theme’s muted text contrast on tab strips.

Keep container observation active in React 18 StrictMode and preserve nested panel state across ordinary responsive breakpoint changes.

Keep restored floats within a narrower viewport without modifying their saved geometry.
