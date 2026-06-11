"use client";

import type { ReactNode } from "react";

import { TabOverflowMenu } from "../tab-overflow";

import { useTabset } from "./tabset-store";

// The menu of tabs clipped out of the tablist's visible box. Measurement lives
// in Tabset.Root (the store's overflowItems); this part only renders the
// APG menu-button when there is something to show.
const TabsetOverflowMenu = (): ReactNode => {
  const overflowItems = useTabset((state) => state.overflowItems);
  const selectOverflowTab = useTabset((state) => state.selectOverflowTab);

  if (overflowItems.length === 0) {
    return null;
  }
  return <TabOverflowMenu items={overflowItems} onSelect={selectOverflowTab} />;
};

export { TabsetOverflowMenu };
