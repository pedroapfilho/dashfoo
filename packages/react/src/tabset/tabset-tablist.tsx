"use client";

import type { ComponentProps, ReactNode } from "react";
import { forwardRef, useCallback, useContext, useMemo } from "react";

import { useNodeDraggable } from "../drag/drag-hooks";
import { useLayout } from "../layout/layout-store";
import { tabDomId } from "../lib/dom-ids";
import { mergeRefs } from "../lib/merge-refs";
import { PART } from "../lib/parts";

import { useTablistSpace } from "./tablist-space";
import type { OverflowItem } from "./tabset-store";
import { TabsetStoreContext, useTabset } from "./tabset-store";
import { useTabsetDrag } from "./tabset-toolbar";
import { useTabOverflow } from "./use-tab-overflow";

type TabsetTabStripProps = ComponentProps<"div">;

/** Its empty space, between and around the tabs and toolbar controls, drags the whole tabset. */
const TabsetTabStrip = forwardRef<HTMLDivElement, TabsetTabStripProps>(
  ({ style, ...props }, userRef): ReactNode => {
    const { grip, label, node } = useTabsetDrag();

    const { ref } = useNodeDraggable("tabset", node.id, {
      disabled: !grip,
      handle: "header",
      label,
    });

    const refCallback = useMemo(() => mergeRefs<HTMLDivElement>(ref, userRef), [ref, userRef]);

    return <div {...props} data-dashfoo={PART.tabstrip} ref={refCallback} style={style} />;
  },
);

TabsetTabStrip.displayName = "TabsetTabStrip";

type TabsetTablistProps = ComponentProps<"div">;

const TabsetTablist = forwardRef<HTMLDivElement, TabsetTablistProps>(
  ({ "aria-label": ariaLabel, children, style, ...props }, userRef): ReactNode => {
    const store = useContext(TabsetStoreContext);
    const node = useTabset((state) => state.node);
    const documentId = useTabset((state) => state.documentId);
    const registerTablist = useTabset((state) => state.registerTablist);
    const tablistElement = useTabset((state) => state.tablistElement);
    const editingTabId = useTabset((state) => state.editingTabId);

    const reportOverflow = useCallback(
      (overflowItems: Array<OverflowItem>): void => {
        store?.setState({ overflowItems });
      },
      [store],
    );

    useTabOverflow(tablistElement, node.children, reportOverflow);

    const tablistSpaces = useLayout((state) => state.tablistSpace);

    const reportSpace = useCallback(
      (tablistSpace: number | undefined): void => {
        store?.setState({ tablistSpace });
        tablistSpaces.set(node.id, tablistSpace);
      },
      [node.id, store, tablistSpaces],
    );

    useTablistSpace(tablistElement, node.children, reportSpace);

    const refCallback = useMemo(
      () => mergeRefs<HTMLDivElement>(registerTablist, userRef),
      [registerTablist, userRef],
    );

    const ownedTabs = node.children
      .flatMap((tab) => (tab.id === editingTabId ? [] : [tabDomId(documentId, node.id, tab.id)]))
      .join(" ");

    return (
      <div {...props} data-dashfoo="tablist" ref={refCallback} style={style} tabIndex={-1}>
        {/* Close buttons and rename inputs stay outside the tablist in the
          accessibility tree. Ownership keeps custom tab chrome composable. */}
        {ownedTabs ? (
          <span
            aria-label={ariaLabel ?? node.name ?? "Tabs"}
            aria-orientation="horizontal"
            aria-owns={ownedTabs}
            role="tablist"
          />
        ) : null}
        {children}
      </div>
    );
  },
);

TabsetTablist.displayName = "TabsetTablist";

export { TabsetTablist, TabsetTabStrip };

export type { TabsetTablistProps, TabsetTabStripProps };
