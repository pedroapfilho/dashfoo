"use client";

import type { ComponentProps, ReactNode } from "react";
import { forwardRef, useMemo } from "react";

import { mergeRefs } from "../../lib/merge-refs";
import { tabDomId } from "../../lib/tab-ids";

import { useTabset } from "./tabset-store";

type TabsetTabStripProps = ComponentProps<"div">;

const TabsetTabStrip = forwardRef<HTMLDivElement, TabsetTabStripProps>(
  ({ style, ...props }, ref): ReactNode => (
    <div {...props} data-dashfoo="tabstrip" ref={ref} style={style} />
  ),
);

TabsetTabStrip.displayName = "TabsetTabStrip";

type TabsetTablistProps = ComponentProps<"div">;

const TabsetTablist = forwardRef<HTMLDivElement, TabsetTablistProps>(
  ({ "aria-label": ariaLabel, children, style, ...props }, userRef): ReactNode => {
    const node = useTabset((state) => state.node);
    const registerTablist = useTabset((state) => state.registerTablist);
    const editingTabId = useTabset((state) => state.editingTabId);

    const refCallback = useMemo(
      () => mergeRefs<HTMLDivElement>(registerTablist, userRef),
      [registerTablist, userRef],
    );

    const ownedTabs = node.children
      .filter((tab) => tab.id !== editingTabId)
      .map((tab) => tabDomId(node.id, tab.id))
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
