"use client";

import type { Action, Dashfoo } from "@dashfoo/core";
import type { DashfooHandle } from "@dashfoo/react";
import { DashfooLayout } from "@dashfoo/react";
import type { ReactNode } from "react";
import { useMemo, useRef, useState, useSyncExternalStore } from "react";

import { ActivityContext } from "./activity-panel";
import { showcaseModel } from "./model";
import { renderPanel } from "./panels";

const noopSubscribe = (): (() => void) => () => {};
const BUTTON =
  "min-h-11 rounded-md border border-border px-3 text-sm hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-40";
const ACTION_LABELS: Partial<Record<Action["type"], string>> = {
  adjustSplit: "Resized a split",
  deleteTab: "Closed a tab",
  dockFloat: "Docked a floating panel",
  floatTabset: "Floated a panel",
  moveFloat: "Moved or resized a floating panel",
  moveNode: "Docked a tab",
  moveTabset: "Docked a tabset",
  renameFloat: "Renamed a floating panel",
  renameTab: "Renamed a tab",
  selectTab: "Selected a tab",
  setFloatMinimized: "Changed panel minimization",
  setMaximizedTabset: "Changed panel maximization",
};

const LiveDemo = (): ReactNode => {
  const isClient = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  const defaultModel = useMemo(() => showcaseModel(), []);
  const layout = useRef<DashfooHandle>(null);
  const [history, setHistory] = useState({ redo: false, undo: false });
  const [activity, setActivity] = useState<Array<string>>([]);
  const handleModelChange = (_model: Dashfoo, action?: Action): void => {
    const label = action
      ? (ACTION_LABELS[action.type] ?? "Updated the layout")
      : "Changed layout history";
    setHistory({
      redo: layout.current?.canRedo() ?? false,
      undo: layout.current?.canUndo() ?? false,
    });
    setActivity((previous) => [label, ...previous].slice(0, 5));
  };
  const handleReset = (): void => {
    layout.current?.resetLayout();
    setHistory({ redo: false, undo: false });
    setActivity(["Reset the layout and cleared its saved arrangement"]);
  };
  const handleUndo = (): void => layout.current?.undo();
  const handleRedo = (): void => layout.current?.redo();

  return (
    <div className="border-border bg-card overflow-hidden rounded-xl border">
      <div className="border-border flex flex-wrap items-center gap-2 border-b p-3">
        <button className={BUTTON} disabled={!history.undo} onClick={handleUndo} type="button">
          Undo
        </button>
        <button className={BUTTON} disabled={!history.redo} onClick={handleRedo} type="button">
          Redo
        </button>
        <button className={BUTTON} onClick={handleReset} type="button">
          Reset layout
        </button>
        <p className="text-muted-foreground hidden flex-1 text-right text-sm md:block">
          Drag tabs to dock. Resize a split. Try the float button.
        </p>
        <p className="text-muted-foreground w-full text-sm md:hidden">
          Tap tabs to switch panels. On wider screens, drag to rearrange.
        </p>
      </div>
      <div className="h-[480px] p-3 sm:p-4">
        {isClient ? (
          <ActivityContext.Provider value={activity}>
            <DashfooLayout
              defaultModel={defaultModel}
              factory={renderPanel}
              floatable
              keepMounted
              onModelChange={handleModelChange}
              persist="dashfoo:landing:demo"
              ref={layout}
              responsive={{ maxWidth: 720 }}
            />
          </ActivityContext.Provider>
        ) : (
          <div aria-label="Loading interactive layout" className="bg-muted size-full rounded-sm" />
        )}
      </div>
    </div>
  );
};

export { LiveDemo };
