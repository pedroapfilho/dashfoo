---
"@dashfoo/react": minor
---

Remove the unused `global` prop from `Layout.FloatLayer`. Floating panels already inherit their capabilities from the layout above them; drop `global={...}` from any hand-built `<Layout.FloatLayer>`.
