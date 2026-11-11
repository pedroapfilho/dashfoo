"use client";

import type {
  Action,
  Dashfoo,
  GlobalAttributes,
  SnapConfig,
  TabNode,
  TabsetNode,
} from "@dashfoo/core";
import type { ComponentProps, ReactNode, Ref } from "react";
import { useId, useState } from "react";

import { DashfooDragProvider } from "../drag/drag-root";
import { useMirroredStore } from "../lib/use-mirrored-store";
import type { TablistSpace } from "../tabset/tablist-space";
import { createTablistSpace } from "../tabset/tablist-space";

import type { LayoutState } from "./layout-store";
import { createLayoutStore, LayoutStoreContext, useLayout } from "./layout-store";

const DEFAULT_TABSET_MIN_SIZE = 320;

/** What a layout lets the user do. Every default lives in `resolveLayoutOptions`. */
type LayoutOptions = {
  closableTabs?: boolean;
  draggableTabs?: boolean;
  draggableTabsets?: boolean;
  editable?: boolean;
  floatable?: boolean;
  /** `true` keeps inactive tabs mounted and hidden; `"activity"` keeps them in a hidden React `<Activity>`, which pauses their effects. */
  keepMounted?: boolean | "activity";
  maximizable?: boolean;
  renamableTabs?: boolean;
  resizableSplits?: boolean;
  /** When false, the tree itself is frozen: no dragging, splitting or floating. Tabs stay closable and renamable. */
  restructurable?: boolean;
  snap?: SnapConfig;
};

type LayoutRenderers = {
  tab: (tab: TabNode) => ReactNode;
  tabLabel?: (tab: TabNode) => ReactNode;
  tabsetToolbar?: (tabset: TabsetNode) => ReactNode;
};

type LayoutRootProps = Omit<ComponentProps<"div">, "children" | "ref" | "style"> &
  LayoutOptions & {
    children: ReactNode;
    dispatch: (action: Action) => void;
    model: Dashfoo;
    renderers: LayoutRenderers;
    rootRef?: Ref<HTMLDivElement>;
    /** Where each tabset's measured tablist space is published, for readers outside the layout. */
    tablistSpace?: TablistSpace;
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
    editable,
    floatable: structural && options.floatable === true,
    keepMounted: options.keepMounted ?? false,
    maximizable: noneSwitchedOff(options.maximizable, global.tabSetEnableMaximize),
    renamableTabs: noneSwitchedOff(editable, options.renamableTabs, global.tabEnableRename),
    resizableSplits: noneSwitchedOff(structural, options.resizableSplits, global.enableSplitResize),
    snap: options.snap ?? global.snap ?? null,
    splitDock: global.enableSplitDock !== false,
    tabLocation: global.tabLocation ?? "top",
    tabsetMinSize: global.tabSetMinSize ?? DEFAULT_TABSET_MIN_SIZE,
    tabStripEnabled: global.tabSetEnableTabStrip !== false,
  };
};

/** A layout without a host-supplied registry still publishes to one of its own. */
const useTablistSpaceOrOwn = (tablistSpace: TablistSpace | undefined): TablistSpace => {
  const [own] = useState(createTablistSpace);

  return tablistSpace ?? own;
};

/** Separates the capability props from the native props forwarded to the root element. */
const splitLayoutOptions = ({
  closableTabs,
  draggableTabs,
  draggableTabsets,
  editable,
  floatable,
  keepMounted,
  maximizable,
  renamableTabs,
  resizableSplits,
  restructurable,
  snap,
  ...props
}: Omit<
  LayoutRootProps,
  "children" | "dispatch" | "model" | "renderers" | "rootRef" | "tablistSpace"
>) => ({
  options: {
    closableTabs,
    draggableTabs,
    draggableTabsets,
    editable,
    floatable,
    keepMounted,
    maximizable,
    renamableTabs,
    resizableSplits,
    restructurable,
    snap,
  },
  props,
});

const LayoutRoot = ({
  children,
  dispatch,
  model,
  renderers,
  rootRef,
  tablistSpace,
  ...rest
}: LayoutRootProps): ReactNode => {
  const { options, props } = splitLayoutOptions(rest);
  const documentId = useId();
  const space = useTablistSpaceOrOwn(tablistSpace);
  const { global } = model;

  const store = useMirroredStore(createLayoutStore, {
    ...resolveLayoutOptions(global, options),
    dispatch,
    documentId,
    maximizedTabsetId: model.maximizedTabsetId,
    renderTab: renderers.tab,
    renderTabLabel: renderers.tabLabel,
    renderTabsetToolbar: renderers.tabsetToolbar,
    tablistSpace: space,
  });

  return (
    <LayoutStoreContext.Provider value={store}>
      <div
        {...props}
        data-dashfoo="layout"
        ref={rootRef}
        style={{
          "--dashfoo-splitter-size":
            global.splitterSize === undefined ? undefined : `${global.splitterSize}px`,
        }}
      >
        <DashfooDragProvider>{children}</DashfooDragProvider>
      </div>
    </LayoutStoreContext.Provider>
  );
};

type LayoutOverridesProps = {
  children: ReactNode;
  overrides: Partial<LayoutState>;
};

/**
 * Republishes the parent store with overrides applied rather than re-deriving
 * flags, so anything the parent changes keeps flowing into the subtree.
 */
const LayoutOverrides = ({ children, overrides }: LayoutOverridesProps): ReactNode => {
  const parentState = useLayout((state) => state);
  const store = useMirroredStore(createLayoutStore, { ...parentState, ...overrides });

  return <LayoutStoreContext.Provider value={store}>{children}</LayoutStoreContext.Provider>;
};

export { LayoutOverrides, LayoutRoot };

export type { LayoutOptions, LayoutOverridesProps, LayoutRenderers, LayoutRootProps };
