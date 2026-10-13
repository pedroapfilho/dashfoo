import type { TabsetNode } from "@dashfoo/core";
import { findTabset } from "@dashfoo/core";
import {
  Layout,
  Tabset,
  useDashfooStore,
  useResponsiveLayout,
  useTab,
  useTabset,
} from "@dashfoo/react";
import { Redo2, Undo2 } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo } from "react";

import { Button, DemoStage } from "../components/demo-stage";
import { PlaceholderPanel } from "../components/placeholder-panel";
import { dockingModel } from "../models";

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
        <Tabset.MaximizeButton />
        <Tabset.Grip />
      </Tabset.Toolbar>
    </Tabset.TabStrip>
    <Tabset.Content />
  </Tabset.Root>
);

const RawPage = (): ReactNode => {
  const defaultModel = useMemo(() => dockingModel(), []);
  const store = useDashfooStore({ defaultModel });
  const responsive = useResponsiveLayout(store.model, { maxWidth: 720 });
  const view = responsive.model;
  const maximized =
    view.maximizedTabsetId === undefined ? undefined : findTabset(view, view.maximizedTabsetId);

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
      description="No DashfooLayout here. This page wires useDashfooStore to Layout.Root, Layout.DragLayer, and Layout.Rows by hand, and composes every tabset from the Tabset.* parts: custom tab labels, a tab counter in the toolbar, reordered controls. Everything still drags, docks, renames, and maximizes."
      title="Raw primitives"
    >
      <Layout.Root
        dispatch={store.dispatch}
        maximizable={responsive.maximizable}
        model={view}
        renderers={{ tab: PlaceholderPanel }}
        restructurable={responsive.restructurable}
        rootRef={responsive.rootRef}
      >
        <Layout.DragLayer>
          {maximized ? (
            <RawTabset node={maximized} />
          ) : (
            <Layout.Rows
              node={view.layout}
              renderTabset={(tabset) => <RawTabset node={tabset} />}
            />
          )}
        </Layout.DragLayer>
      </Layout.Root>
    </DemoStage>
  );
};

export { RawPage };
