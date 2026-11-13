import type { GlobalAttributes, SnapConfig, TabNode, TabsetNode } from "@dashfoo/core";

import type { DragGroupScope } from "../drag/drag-group";
import type { TearOffHandler } from "../drag/tear-off";

import type { LayoutState } from "./layout-store";

const DEFAULT_TABSET_MIN_SIZE = 320;

/** What a layout lets the user do. Every default lives in `resolveLayoutOptions`. */
type LayoutOptions = {
  closableTabs?: boolean;
  draggableTabs?: boolean;
  draggableTabsets?: boolean;
  /** Layouts sharing a group exchange tabs and tabsets by drag, across windows and browser tabs of one origin. */
  dragGroup?: string;
  dragGroupScope?: DragGroupScope;
  /** When false, tabs and tabsets can't be dropped at the layout's edges, beside everything else. */
  edgeDocking?: boolean;
  editable?: boolean;
  floatable?: boolean;
  /** `true` keeps inactive tabs mounted and hidden; `"activity"` keeps them in a hidden React `<Activity>`, which pauses their effects. */
  keepMounted?: boolean | "activity";
  maximizable?: boolean;
  /** Called when a tab or tabset is released outside the window; return `true` to remove it. */
  onTearOff?: TearOffHandler;
  renamableTabs?: boolean;
  resizableSplits?: boolean;
  /** When false, the tree itself is frozen: no dragging, splitting or floating. Tabs stay closable and renamable. */
  restructurable?: boolean;
  snap?: SnapConfig;
};

type ResolvedOptions = Omit<
  LayoutState,
  | "dispatch"
  | "documentId"
  | "maximizedTabsetId"
  | "renderTab"
  | "renderTabLabel"
  | "renderTabsetToolbar"
  | "tablistSpace"
>;

const noneSwitchedOff = (...switches: Array<boolean | undefined>): boolean =>
  switches.every((value) => value !== false);

/** A layout that cannot dock joins no group, so drags never land in or leave it. */
const resolveDragGroup = (
  structural: boolean,
  { dragGroup, dragGroupScope = "origin" }: LayoutOptions,
): Pick<ResolvedOptions, "dragGroup" | "dragGroupScope"> => ({
  dragGroup: structural ? dragGroup : undefined,
  dragGroupScope,
});

/** What the model's `global` decides with no host prop to weigh against it. */
const resolveGlobalOptions = (
  global: GlobalAttributes,
): Pick<
  ResolvedOptions,
  "selectOnRemove" | "splitDock" | "tabLocation" | "tabsetMinSize" | "tabStripEnabled"
> => ({
  selectOnRemove: global.tabSetSelectOnRemove ?? "neighbor",
  splitDock: global.enableSplitDock !== false,
  tabLocation: global.tabLocation ?? "top",
  tabsetMinSize: global.tabSetMinSize ?? DEFAULT_TABSET_MIN_SIZE,
  tabStripEnabled: global.tabSetEnableTabStrip !== false,
});

/** The host's options and the model's `global` attributes, combined: either side can switch a capability off. */
const resolveLayoutOptions = (
  global: GlobalAttributes,
  options: LayoutOptions,
): ResolvedOptions => {
  const editable = options.editable ?? true;
  const structural = editable && options.restructurable !== false;

  return {
    canDock: structural,
    closableTabs: noneSwitchedOff(editable, options.closableTabs, global.tabEnableClose),
    draggableTabs: noneSwitchedOff(structural, options.draggableTabs, global.tabEnableDrag),
    draggableTabsets: noneSwitchedOff(structural, options.draggableTabsets),
    ...resolveDragGroup(structural, options),
    edgeDocking: options.edgeDocking !== false,
    editable,
    floatable: structural && options.floatable === true,
    keepMounted: options.keepMounted ?? false,
    maximizable: noneSwitchedOff(options.maximizable, global.tabSetEnableMaximize),
    onTearOff: options.onTearOff,
    renamableTabs: noneSwitchedOff(editable, options.renamableTabs, global.tabEnableRename),
    resizableSplits: noneSwitchedOff(structural, options.resizableSplits, global.enableSplitResize),
    snap: options.snap ?? global.snap ?? null,
    ...resolveGlobalOptions(global),
  };
};

/** A float has no edge to dock at, cannot float again and has nothing to maximize over. */
const INSIDE_FLOAT = {
  edgeDocking: false,
  floatable: false,
  maximizable: false,
} as const satisfies Partial<ResolvedOptions>;

type TabsetCapabilities = {
  closableTabs: boolean;
  /** Moving a tabset moves every tab in it, so one tab that can't be dragged pins the whole tabset. */
  draggable: boolean;
  draggableTabs: boolean;
  maximizable: boolean;
  renamableTabs: boolean;
};

type LayoutCapabilities = Pick<
  LayoutState,
  "closableTabs" | "draggableTabs" | "draggableTabsets" | "maximizable" | "renamableTabs"
>;

/** The layout's answer narrowed by the tabset's own flags. */
const tabsetCapabilities = (
  layout: LayoutCapabilities,
  tabset: TabsetNode,
): TabsetCapabilities => ({
  closableTabs: layout.closableTabs && tabset.enableClose !== false,
  draggable:
    layout.draggableTabsets &&
    tabset.enableDrag !== false &&
    tabset.children.every((tab) => tab.enableDrag !== false),
  draggableTabs: layout.draggableTabs,
  maximizable: layout.maximizable && tabset.enableMaximize !== false,
  renamableTabs: layout.renamableTabs,
});

type TabCapabilities = { closable: boolean; draggable: boolean; renamable: boolean };

/** The tabset's answer narrowed by the tab's own flags. */
const tabCapabilities = (tabset: TabsetCapabilities, tab: TabNode): TabCapabilities => ({
  closable: tabset.closableTabs && tab.enableClose !== false,
  draggable: tabset.draggableTabs && tab.enableDrag !== false,
  renamable: tabset.renamableTabs && tab.enableRename !== false,
});

export { INSIDE_FLOAT, resolveLayoutOptions, tabCapabilities, tabsetCapabilities };

export type { LayoutOptions, TabsetCapabilities };
