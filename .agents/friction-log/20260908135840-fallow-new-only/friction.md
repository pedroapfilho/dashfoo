---
title: "Fallow new-only complexity audit treats extracted lower-complexity functions as new debt"
severity: "minor"
---

During React Doctor remediation, extracting DropZoneDrawing and resolveCapabilities reduced the React control-flow complexity (DropZoneOverlay 18 to 6; LayoutRoot 21 to 6). The full Doctor scan and dead-code gate pass, but fallow audit --base origin/main flags newly named extracted functions using export-reference-based CRAP estimates. This makes a behavior-preserving extraction fail the new-only gate even though the underlying branches were already present. Review whether complexity attribution can recognize moved/extracted code or whether measured test coverage should drive this auxiliary audit. No thresholds or rules were changed.
