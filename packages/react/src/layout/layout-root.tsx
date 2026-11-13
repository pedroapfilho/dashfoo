"use client";

import type { Action, Dashfoo, GlobalAttributes, TabNode, TabsetNode } from "@dashfoo/core";
import type { ComponentProps, ReactNode, Ref } from "react";
import { useId, useState } from "react";

import { DashfooDragProvider } from "../drag/drag-root";
import { useGroupDocument } from "../drag/use-group-document";
import { PART } from "../lib/parts";
import { useMirroredStore } from "../lib/use-mirrored-store";
import type { TablistSpace } from "../tabset/tablist-space";
import { createTablistSpace } from "../tabset/tablist-space";

import type { LayoutOptions } from "./capabilities";
import { resolveLayoutOptions } from "./capabilities";
import type { LayoutState } from "./layout-store";
import { createLayoutStore, LayoutStoreContext, useLayoutInternals } from "./layout-store";

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

const splitterSize = ({ splitterSize: size }: GlobalAttributes): string | undefined =>
  size === undefined ? undefined : `${size}px`;

/** A layout without a host-supplied registry still publishes to one of its own. */
const useTablistSpaceOrOwn = (tablistSpace: TablistSpace | undefined): TablistSpace => {
  const [own] = useState(createTablistSpace);

  return tablistSpace ?? own;
};

type OwnRootProps = "children" | "dispatch" | "model" | "renderers" | "rootRef" | "tablistSpace";

/** `satisfies` every key: an option left out of the list would reach the root `div` as an attribute. */
const splitLayoutOptions = ({
  closableTabs,
  draggableTabs,
  draggableTabsets,
  dragGroup,
  dragGroupScope,
  edgeDocking,
  editable,
  floatable,
  keepMounted,
  maximizable,
  onTearOff,
  renamableTabs,
  resizableSplits,
  restructurable,
  snap,
  ...props
}: Omit<LayoutRootProps, OwnRootProps>) => ({
  options: {
    closableTabs,
    draggableTabs,
    draggableTabsets,
    dragGroup,
    dragGroupScope,
    edgeDocking,
    editable,
    floatable,
    keepMounted,
    maximizable,
    onTearOff,
    renamableTabs,
    resizableSplits,
    restructurable,
    snap,
  } satisfies Record<keyof LayoutOptions, unknown>,
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
    model,
    renderTab: renderers.tab,
    renderTabLabel: renderers.tabLabel,
    renderTabsetToolbar: renderers.tabsetToolbar,
    tablistSpace: space,
  });

  useGroupDocument({
    dispatch,
    documentId,
    dragGroup: options.dragGroup,
    dragGroupScope: options.dragGroupScope,
    model,
  });

  return (
    <LayoutStoreContext.Provider value={store}>
      <div
        {...props}
        data-dashfoo={PART.layout}
        ref={rootRef}
        style={{ "--dashfoo-splitter-size": splitterSize(global) }}
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
  const parentState = useLayoutInternals((state) => state);
  const store = useMirroredStore(createLayoutStore, { ...parentState, ...overrides });

  return <LayoutStoreContext.Provider value={store}>{children}</LayoutStoreContext.Provider>;
};

export { LayoutOverrides, LayoutRoot };

export type { LayoutOverridesProps, LayoutRenderers, LayoutRootProps };
