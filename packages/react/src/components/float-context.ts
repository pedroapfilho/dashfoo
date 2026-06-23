"use client";

import { createContext, useContext } from "react";

// Standalone (leaf) module so the float control can ask "is a FloatLayer present?"
// without importing float-layer.tsx — which pulls in float-panel → row-view →
// the tabset tree and would close an import cycle back to the control.
const FloatLayerContext = createContext(false);

const useHasFloatLayer = (): boolean => useContext(FloatLayerContext);

export { FloatLayerContext, useHasFloatLayer };
