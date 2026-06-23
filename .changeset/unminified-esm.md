---
"@dashfoo/core": patch
"@dashfoo/react": patch
"@dashfoo/theme": patch
---

Ship unminified ESM so downstream bundlers (Vite/esbuild dep pre-bundling) process the package correctly; fixes a `ReferenceError: hasSharedManager is not defined` in consumer dev servers. The consuming app minifies once at its own build.
