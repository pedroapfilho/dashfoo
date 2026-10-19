---
"@dashfoo/core": minor
"@dashfoo/react": patch
---

Export `warn` and `warnOnce` from `@dashfoo/core`. Both packages now report degraded paths through them, so every developer-console warning carries the same `[dashfoo]` prefix, and a missing tab component warns once per component key across layouts.
