---
"@dashfoo/react": patch
---

Flush pending layout saves on `pagehide` and `visibilitychange` → hidden. A reload or tab close never unmounts React, so a change made inside the debounce window (default 300 ms) used to die with the page — reloading right after a drag silently lost it.
