"use client";

import type { Action, TabNode } from "@dashfoo/core";
import type { ReactNode } from "react";
import { createContext, useContext } from "react";

type DashfooContextValue = {
  closableTabs: boolean;
  dispatch: (action: Action) => void;
  maximizable: boolean;
  maximizedTabsetId?: string;
  renamableTabs: boolean;
  renderTab: (tab: TabNode) => ReactNode;
  tabLocation: "bottom" | "top";
  tabStripEnabled: boolean;
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
