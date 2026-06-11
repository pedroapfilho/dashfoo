"use client";

// Public API for @dashfoo/react.
// DashfooLayout (store binding, registry/factory, views), the docking chrome
// (close/rename/maximize), and layout persistence.

export * from "./hooks/context";
export * from "./components/dashfoo-layout";
export * from "./components/drag-root";
export * from "./components/panel";
export * from "./hooks/persistence";
export * from "./hooks/responsive";
export * from "./hooks/store";
// drag-hooks stays internal except the external-source surface.
export { useExternalTabSource } from "./hooks/drag-hooks";
export type { ExternalTabSourceOptions } from "./hooks/drag-hooks";
