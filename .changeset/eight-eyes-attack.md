---
"@dashfoo/react": minor
---

The tab-strip drop indicator is now a ghost shaped exactly like the tab it previews instead of a thin insertion line: it takes the dragged tab-item's width, sits in the same vertical box as the target strip's tabs, and shares the split-zone pane's fill and border vars. Its corners read the new `--dashfoo-dock-tab-radius` variable (the shipped theme rounds only the top corners, like its tabs). The indicator now morphs between the ghost and the pane instead of remounting. The `--dashfoo-dock-line` and `--dashfoo-dock-line-radius` CSS variables are gone.
