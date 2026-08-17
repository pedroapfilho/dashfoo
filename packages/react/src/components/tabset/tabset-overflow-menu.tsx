"use client";

import type { ReactNode } from "react";

import { TabOverflowMenu } from "../tab-overflow-menu";

import { useTabset } from "./tabset-store";

const TabsetOverflowMenu = (): ReactNode => {
  const overflowItems = useTabset((state) => state.overflowItems);
  const selectOverflowTab = useTabset((state) => state.selectOverflowTab);

  if (overflowItems.length === 0) {
    return null;
  }
  return <TabOverflowMenu items={overflowItems} onSelect={selectOverflowTab} />;
};

export { TabsetOverflowMenu };
