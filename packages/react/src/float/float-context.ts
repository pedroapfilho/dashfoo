"use client";

import { createContext, useContext } from "react";

const FloatLayerContext = createContext(false);

const useHasFloatLayer = (): boolean => useContext(FloatLayerContext);

export { FloatLayerContext, useHasFloatLayer };
