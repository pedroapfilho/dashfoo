export { dragDockMachine, dropAction } from "./dock/drag-dock-machine";

export type { DragState, DropResolution } from "./dock/drag-dock-machine";

export { warn, warnOnce } from "./lib/warn";

export { canCollapseTabset } from "./model/collapse";

export { decideSnap, resolveSnapGrid, settleSnap, snapEnabled } from "./snap/snap";

export type { SnapDecision, SnapGrid } from "./snap/snap";

export { fallbackSelectedIndex } from "./state/detach";
