# Show HN draft

Title: **Show HN: Dashfoo – Headless docking layouts for React**

URL: https://www.dashfoo.com

## Introduction

I built dashfoo for React applications that need an editor-like workspace:
tabs that stack and split, resizable panes, and floating panels. I wanted the
layout model and docking behavior while being able to compose the chrome myself.

The layout is a plain JSON-serializable object. You can use the complete React
component or compose Layout and Tabset parts, then supply your own CSS. There's
also an optional theme, plus controlled state, undo/redo, persistence, external
widget dragging, and a responsive stacked view.

The site has a live example you can rearrange without signing in. The fuller
demo includes custom composition and application-owned controls, and the docs
include runnable Vite and Next.js starters.

It's MIT-licensed and intended for early adopters. React 18.3 and 19 are supported.
Docking is pointer-only, floats stay inside the app, and there is no built-in
migration system for persisted layouts. I'm interested in feedback from people
building editors, internal tools, terminals, and dashboards, especially where
the composition API or first installation gets in your way.

Demo: https://demo.dashfoo.com
Docs: https://docs.dashfoo.com
Code and feedback: https://github.com/pedroapfilho/dashfoo

## Short version for other developer communities

Dashfoo is an MIT-licensed React docking-layout library. Compose your own chrome,
keep the layout as JSON, and use tabs, splits, in-app floats, and undo/redo. Try
the live demo and Vite/Next.js starters. This is an early-adopter release;
feedback and reproductions belong in GitHub Issues.

## Demonstration sequence

Show a tab becoming a directional split; resize it; float and minimize a panel;
restore and dock it back; undo; then reload the persisted arrangement. Show the
mobile stacked view separately. Use sample data and hide unrelated desktop UI.

The recording and screenshots in `assets/` should show the release candidate.
No account or backend is needed to reproduce the demonstration.
