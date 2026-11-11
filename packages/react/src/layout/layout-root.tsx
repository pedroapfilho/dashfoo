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
import { useEffect, useId, useLayoutEffect, useRef } from "react";

import type { DragGroupScope } from "../drag/drag-group";
import { registerDocument } from "../drag/drag-group";
import { DashfooDragProvider } from "../drag/drag-root";
import type { TearOffHandler } from "../drag/tear-off";
import { useMirroredStore } from "../lib/use-mirrored-store";

import type { LayoutState } from "./layout-store";
import { createLayoutStore, LayoutStoreContext, useLayout } from "./layout-store";

const DEFAULT_TABSET_MIN_SIZE = 320;

/** What a layout lets the user do. Every default lives in `resolveLayoutOptions`. */
type LayoutOptions = {
  closableTabs?: boolean;
  draggableTabs?: boolean;
  draggableTabsets?: boolean;
  /** Layouts sharing a group exchange tabs and tabsets by drag, across windows and browser tabs of one origin. */
  dragGroup?: string;
  dragGroupScope?: DragGroupScope;
  editable?: boolean;
  floatable?: boolean;
  keepMounted?: boolean;
  maximizable?: boolean;
  /** Called when a tab or tabset is released outside the window; return `true` to remove it. */
  onTearOff?: TearOffHandler;
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
  };

type ResolvedOptions = Omit<
  LayoutState,
  | "dispatch"
  | "documentId"
  | "maximizedTabsetId"
  | "renderTab"
  | "renderTabLabel"
  | "renderTabsetToolbar"
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
    dragGroup: structural ? options.dragGroup : undefined,
    dragGroupScope: options.dragGroupScope ?? "origin",
    editable,
    floatable: structural && options.floatable === true,
    keepMounted: options.keepMounted === true,
    maximizable: noneSwitchedOff(options.maximizable, global.tabSetEnableMaximize),
    onTearOff: options.onTearOff,
    renamableTabs: noneSwitchedOff(editable, options.renamableTabs, global.tabEnableRename),
    resizableSplits: noneSwitchedOff(structural, options.resizableSplits, global.enableSplitResize),
    snap: options.snap ?? global.snap ?? null,
    splitDock: global.enableSplitDock !== false,
    tabLocation: global.tabLocation ?? "top",
    tabsetMinSize: global.tabSetMinSize ?? DEFAULT_TABSET_MIN_SIZE,
    tabStripEnabled: global.tabSetEnableTabStrip !== false,
  };
};

const LayoutRoot = ({
  children,
  closableTabs,
  dispatch,
  draggableTabs,
  draggableTabsets,
  dragGroup,
  dragGroupScope,
  editable,
  floatable,
  keepMounted,
  maximizable,
  model,
  onTearOff,
  renamableTabs,
  renderers,
  resizableSplits,
  restructurable,
  rootRef,
  snap,
  ...props
}: LayoutRootProps): ReactNode => {
  const documentId = useId();
  const { global } = model;

  const store = useMirroredStore(createLayoutStore, {
    ...resolveLayoutOptions(global, {
      closableTabs,
      draggableTabs,
      draggableTabsets,
      dragGroup,
      dragGroupScope,
      editable,
      floatable,
      keepMounted,
      maximizable,
      onTearOff,
      renamableTabs,
      resizableSplits,
      restructurable,
      snap,
    }),
    dispatch,
    documentId,
    maximizedTabsetId: model.maximizedTabsetId,
    renderTab: renderers.tab,
    renderTabLabel: renderers.tabLabel,
    renderTabsetToolbar: renderers.tabsetToolbar,
  });

  const latest = useRef({ dispatch, model });
  useLayoutEffect(() => {
    latest.current = { dispatch, model };
  });

  const scope = dragGroupScope ?? "origin";
  useEffect(
    () =>
      registerDocument(documentId, {
        dispatch: (action) => {
          latest.current.dispatch(action);
        },
        getModel: () => latest.current.model,
        group: dragGroup,
        scope,
      }),
    [documentId, dragGroup, scope],
  );

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
