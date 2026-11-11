"use client";

import { createContext, useContext } from "react";

const FloatLayerContext = createContext(false);

/** True inside a float's own body, where drops land above the docked layout. */
const InsideFloatContext = createContext(false);

const useHasFloatLayer = (): boolean => useContext(FloatLayerContext);

export { FloatLayerContext, InsideFloatContext, useHasFloatLayer };
