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
import { TabsetGrip, TabsetMaximizeButton, TabsetToolbar } from "./tabset-toolbar";

// The canonical composition of the Tabset parts — what DashfooLayout and
// Layout.Rows render by default, and the reference for anyone composing the
// parts by hand. Lives inside Tabset.Root because the toolbar-visibility
// condition needs the store's overflow count.
const DefaultTabsetLayout = (): ReactNode => {
  const draggableTabsets = useLayout((state) => state.draggableTabsets);
  const renderTabsetToolbar = useLayout((state) => state.renderTabsetToolbar);
  const tabLocation = useLayout((state) => state.tabLocation);
  const tabStripEnabled = useLayout((state) => state.tabStripEnabled);
  const isMaximized = useTabset((state) => state.isMaximized);
  const node = useTabset((state) => state.node);
  const overflowCount = useTabset((state) => state.overflowItems.length);
  const showMaximize = useTabset((state) => state.showMaximize);

  // The toolbar exists only when it has content; each part also self-hides so
  // the condition and the parts can never disagree.
  const showToolbar =
    showMaximize ||
    renderTabsetToolbar !== undefined ||
    overflowCount > 0 ||
    (draggableTabsets && !isMaximized);

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
          <TabsetMaximizeButton />
        </TabsetToolbar>
      ) : null}
    </TabsetTabStrip>
  ) : null;

  const content = <TabsetContent />;

  return tabLocation === "bottom" ? (
    <>
      {content}
      {strip}
    </>
  ) : (
    <>
      {strip}
      {content}
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
