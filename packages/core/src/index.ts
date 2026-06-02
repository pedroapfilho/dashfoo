// Public API barrel for @dashfoo/core.
// Phase 2: schema → reducer → history → serialize → geometry.
// Phase 3: the XState actor system.

export * from "./actions";
export { normalize } from "./invariants";
export * from "./reducer";
export * from "./schema";
export * from "./tree";
