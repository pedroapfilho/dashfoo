// Public API barrel for @dashfoo/core.
// The framework-free engine: schema · tree · invariants · actions · reducer ·
// geometry · history · serialize · ids · the XState actor system.

export * from "./state/actions";
export * from "./model/builders";
export * from "./geometry/geometry";
export * from "./geometry/snap";
export * from "./state/history";
export * from "./model/ids";
export { normalize } from "./model/invariants";
export * from "./machines";
export * from "./state/reducer";
export * from "./model/schema";
export * from "./model/serialize";
export * from "./model/stack";
export * from "./model/tree";
