---
"@dashfoo/react": patch
---

Pointer drags and the browser's drag and drop run through one internal drag session, and a layout registers its store instead of a copy of its model. A layout that cannot dock (`editable` or `restructurable` off) no longer hands a node over to a drop that was already in flight when it was frozen.
