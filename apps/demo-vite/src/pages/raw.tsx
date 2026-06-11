import type { TabsetNode } from "@dashfoo/core";
import { findTabset } from "@dashfoo/core";
import { Layout, Tabset, useDashfooStore, useTab, useTabset } from "@dashfoo/react";
import { Redo2, Undo2 } from "lucide-react";
import type { ReactNode } from "react";
import { useMemo } from "react";

import { renderPanel } from "../components/panels";
import { Button, DemoStage } from "../components/ui";
import { dockingModel } from "../models";

// Custom tab label: a status dot that lights up on the selected tab, read
// straight from the primitives' hooks — no DashfooLayout involved.
const RawTabLabel = (): ReactNode => {
  const { index, tab } = useTab();
  const selected = useTabset((state) => state.visualSelected === index);
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        aria-hidden="true"
        className={`size-1.5 rounded-full ${selected ? "bg-emerald-500" : "bg-neutral-300 dark:bg-neutral-600"}`}
      />
      {tab.name}
    </span>
  );
};

// A toolbar add-on the stock composition doesn't have: a live tab counter.
const TabCountBadge = (): ReactNode => {
  const count = useTabset((state) => state.node.children.length);
  return (
    <span className="px-1.5 text-[10px] text-neutral-400 tabular-nums dark:text-neutral-500">
      {count}&nbsp;tabs
    </span>
  );
};

// A hand-built tabset: same parts the library composes internally, rearranged —
// custom label, counter badge, and the maximize button ahead of the grip.
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

// The whole layout assembled by hand: useDashfooStore owns the model,
// Layout.Root provides the store, Layout.DragLayer opts into drag-dock, and
// Layout.Rows renders the split tree with the custom tabset at every leaf.
const RawPage = (): ReactNode => {
  const defaultModel = useMemo(() => dockingModel(), []);
  const store = useDashfooStore({ defaultModel });
  const maximized = store.model.maximizedTabsetId
    ? findTabset(store.model, store.model.maximizedTabsetId)
    : undefined;
  const handleUndo = (): void => store.undo();
  const handleRedo = (): void => store.redo();

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
      description="No DashfooLayout here. This page wires useDashfooStore to Layout.Root, Layout.DragLayer, and Layout.Rows by hand, and composes every tabset from the Tabset.* parts — custom tab labels, a tab counter in the toolbar, reordered controls. Everything still drags, docks, renames, and maximizes."
      title="Raw primitives"
    >
      <Layout.Root dispatch={store.dispatch} model={store.model} renderTab={renderPanel}>
        <Layout.DragLayer>
          {maximized ? (
            <RawTabset node={maximized} />
          ) : (
            <Layout.Rows
              node={store.model.layout}
              renderTabset={(tabset) => <RawTabset node={tabset} />}
            />
          )}
        </Layout.DragLayer>
      </Layout.Root>
    </DemoStage>
  );
};

export { RawPage };
