"use client";

import type { TabsetNode } from "@dashfoo/core";
import type { ReactNode } from "react";

import { useLayout } from "../../hooks/layout-store";

import { TabsetContent } from "./tabset-content";
import { TabsetOverflowMenu } from "./tabset-overflow";
import { TabsetRoot } from "./tabset-root";
import { useTabset } from "./tabset-store";
import { TabsetTab, TabsetTrigger } from "./tabset-tab";
import { TabsetCloseButton, TabsetRenameInput } from "./tabset-tab-controls";
import { TabsetTablist, TabsetTabStrip } from "./tabset-tablist";
import {
  TabsetFloatButton,
  TabsetGrip,
  TabsetMaximizeButton,
  TabsetToolbar,
  useTabsetChrome,
} from "./tabset-toolbar";

const tabsetContent = <TabsetContent />;

const DefaultTabsetLayout = (): ReactNode => {
  const renderTabsetToolbar = useLayout((state) => state.renderTabsetToolbar);
  const tabLocation = useLayout((state) => state.tabLocation);
  const tabStripEnabled = useLayout((state) => state.tabStripEnabled);
  const node = useTabset((state) => state.node);
  const chrome = useTabsetChrome();

  const showToolbar = renderTabsetToolbar !== undefined || Object.values(chrome).some(Boolean);

  const strip = tabStripEnabled ? (
    <TabsetTabStrip>
      <TabsetTablist>
        {node.children.map((tab) => (
          <TabsetTab key={tab.id} tab={tab}>
            <TabsetTrigger />
            <TabsetRenameInput />
            <TabsetCloseButton />
          </TabsetTab>
        ))}
      </TabsetTablist>
      {showToolbar ? (
        <TabsetToolbar>
          <TabsetOverflowMenu />
          <TabsetGrip />
          {renderTabsetToolbar?.(node)}
          <TabsetFloatButton />
          <TabsetMaximizeButton />
        </TabsetToolbar>
      ) : null}
    </TabsetTabStrip>
  ) : null;

  return tabLocation === "bottom" ? (
    <>
      {tabsetContent}
      {strip}
    </>
  ) : (
    <>
      {strip}
      {tabsetContent}
    </>
  );
};

type TabsetViewProps = { node: TabsetNode };

const TabsetView = ({ node }: TabsetViewProps): ReactNode => (
  <TabsetRoot node={node}>
    <DefaultTabsetLayout />
  </TabsetRoot>
);

export { TabsetView };
export type { TabsetViewProps };
