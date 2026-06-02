"use client";

import type { Action, TabNode } from "@dashfoo/core";
import type { ReactNode } from "react";
import { createContext, useContext } from "react";

type DashfooContextValue = {
  dispatch: (action: Action) => void;
  renderTab: (tab: TabNode) => ReactNode;
};

const DashfooContext = createContext<DashfooContextValue | null>(null);

const useDashfooContext = (): DashfooContextValue => {
  const value = useContext(DashfooContext);
  if (value === null) {
    throw new Error("dashfoo components must be rendered inside <DashfooLayout>.");
  }
  return value;
};

export { DashfooContext, useDashfooContext };
export type { DashfooContextValue };
