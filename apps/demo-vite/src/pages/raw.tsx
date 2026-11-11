import type { TabsetNode } from "@dashfoo/core";
import {
  Layout,
  Tabset,
  useDashfooStore,
  useResponsiveLayout,
  useTab,
  useTabset,
} from "@dashfoo/react";
import { PanelRightClose, PanelRightOpen, Redo2, Undo2 } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo } from "react";

import { Button, DemoStage } from "../components/demo-stage";
import { PlaceholderPanel } from "../components/placeholder-panel";
import { COMPACT, rawModel } from "../models";

const RawTabLabel = (): ReactNode => {
  const { index, tab } = useTab();
  const selected = useTabset((state) => state.visualSelected === index);

  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        aria-hidden="true"
        className={`size-1.5 rounded-full ${selected ? "bg-success-indicator" : "bg-surface-disabled dark:bg-surface-dim"}`}
      />
      {tab.name}
    </span>
  );
};

const TabCountBadge = (): ReactNode => {
  const count = useTabset((state) => state.node.children.length);

  return (
    <span className="text-foreground-disabled dark:text-foreground-muted px-1.5 text-xs tabular-nums">
      {count}&nbsp;tabs
    </span>
  );
};

const RawTabset = ({ node }: { node: TabsetNode }): ReactNode => (
  <Tabset.Root node={node}>
    <Tabset.TabStrip>
      <Tabset.Tablist>
        {node.children.map((tab) => (
          <Tabset.Tab key={tab.id} tab={tab}>
            <Tabset.Trigger>
              <RawTabLabel />
            </Tabset.Trigger>
            <Tabset.RenameInput />
            <Tabset.CloseButton />
          </Tabset.Tab>
        ))}
      </Tabset.Tablist>
      <Tabset.Toolbar>
        <TabCountBadge />
        <Tabset.OverflowMenu />
        <Tabset.CollapseButton
          title={({ isCollapsed }) => (isCollapsed ? "Show panel" : "Hide panel")}
        >
          {({ isCollapsed }) =>
            isCollapsed ? <PanelRightOpen size={14} /> : <PanelRightClose size={14} />
          }
        </Tabset.CollapseButton>
        <Tabset.MaximizeButton />
        <Tabset.Grip />
      </Tabset.Toolbar>
    </Tabset.TabStrip>
    <Tabset.Content />
  </Tabset.Root>
);

const RawPage = (): ReactNode => {
  const defaultModel = useMemo(() => rawModel(), []);
  const store = useDashfooStore({ defaultModel });
  const responsive = useResponsiveLayout(store.model, COMPACT);
  const view = responsive.model;

  const handleUndo = (): void => {
    store.undo();
  };

  const handleRedo = (): void => {
    store.redo();
  };

  return (
    <DemoStage
      actions={
        <>
          <Button disabled={!store.canUndo()} icon={<Undo2 size={14} />} onClick={handleUndo}>
            Undo
          </Button>
          <Button disabled={!store.canRedo()} icon={<Redo2 size={14} />} onClick={handleRedo}>
            Redo
          </Button>
        </>
      }
      description="No DashfooLayout here. This page wires useDashfooStore to Layout.Root, Layout.DragLayer, and Layout.Rows by hand, and composes every tabset from the Tabset.* parts: custom tab labels, a tab counter in the toolbar, reordered controls, and a collapse button that draws its own icon from its state. Everything still drags, docks, renames, collapses, and maximizes. Closing a tab hands the selection back to the tab you had open before."
      title="Raw primitives"
    >
      <Layout.Root
        {...responsive.locks}
        dispatch={store.dispatch}
        model={view}
        renderers={{ tab: PlaceholderPanel }}
        rootRef={responsive.rootRef}
      >
        <Layout.DragLayer>
          <Layout.Rows node={view.layout} renderTabset={(tabset) => <RawTabset node={tabset} />} />
        </Layout.DragLayer>
      </Layout.Root>
    </DemoStage>
  );
};

export { RawPage };
