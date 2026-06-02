// Public API barrel for @dashfoo/core.
// Phase 2 (done): schema · tree · invariants · actions · reducer · geometry ·
// history · serialize. Phase 3 (next): the XState actor system.

export * from "./actions";
export * from "./geometry";
export * from "./history";
export { normalize } from "./invariants";
export * from "./machines";
export * from "./reducer";
export * from "./schema";
export * from "./serialize";
export * from "./tree";
