---
"@dashfoo/core": minor
"@dashfoo/react": minor
---

Bind internal drag subjects to their owning document and namespace draggable registrations and tab/panel accessibility IDs. Sibling and nested layouts sharing a provider reject foreign internal drops while main/float moves and external tab factories keep working. Internal `DragSubject` values now require `documentId`, and `COMMIT`/`dropAction` include the original subject for commit-time validation.

Enforce the resolved structural permission at both drop resolution and commit, preventing external widgets and gestures started before compact mode from bypassing its docking lock. Center-only docking remains available when split docking is disabled.
