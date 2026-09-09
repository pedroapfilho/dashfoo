# Early-adopter release candidate

- Saved layouts restore after hydration without replacing the server-rendered
  tree, writing over stored data, or creating undo history.
- Saved floats fit a smaller viewport without rewriting their saved geometry;
  cancelled gestures restore the responsive display bounds.
- Custom storage failures warn and preserve a usable layout.
- React 18 StrictMode retains responsive container observation. Nested panel state
  survives ordinary compact breakpoint changes.
- Native compound refs work with React 18.3 and 19.
- Closable tabs separate tab semantics from close and rename controls in the
  accessibility tree. The `data-dashfoo="tablist"` selector remains the scrolling
  viewport; the semantic tablist inside owns triggers by id.
- Panel bodies are keyboard-focusable scroll regions by default; consumers can
  set `tabIndex` explicitly for a different composition.
- `parseModel` accepts unknown input and validates it at the boundary.
- The landing page demonstrates real history, floating panels, and persisted
  arrangements. The hosted overview includes stateful sample widgets.
- Guides and package references describe current capabilities and limits.
  Standalone Vite and Next.js starters are verified from packed packages.

This release keeps schema version 1. Docking is pointer-only; native-window
popouts, migration machinery, and application widget data are outside the engine.
