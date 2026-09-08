// oxlint-disable jsx-a11y/no-static-element-interactions -- Keyboard events bubble from the owned tabs; the scroll viewport is not itself a tablist.
"use client";

import type { ComponentProps, CSSProperties, KeyboardEvent, ReactNode } from "react";
import { forwardRef, useMemo } from "react";

import { mergeRefs } from "../../lib/merge-refs";
import { tabDomId } from "../../lib/tab-ids";

import { useTabset } from "./tabset-store";

const stripStyle: CSSProperties = { display: "flex", flexShrink: 0 };

const tablistStyle: CSSProperties = { display: "flex", minWidth: 0, overflowX: "auto" };

type TabsetTabStripProps = ComponentProps<"div">;

const TabsetTabStrip = forwardRef<HTMLDivElement, TabsetTabStripProps>(
  ({ style, ...props }, ref): ReactNode => (
    <div {...props} data-dashfoo="tabstrip" ref={ref} style={{ ...stripStyle, ...style }} />
  ),
);

TabsetTabStrip.displayName = "TabsetTabStrip";

type TabsetTablistProps = ComponentProps<"div">;

const TabsetTablist = forwardRef<HTMLDivElement, TabsetTablistProps>(
  (
    {
      "aria-label": ariaLabel,
      children,
      onKeyDown,

      style,
      ...props
    },
    userRef,
  ): ReactNode => {
    const node = useTabset((state) => state.node);
    const registerTablist = useTabset((state) => state.registerTablist);
    const selectTab = useTabset((state) => state.selectTab);
    const editingTabId = useTabset((state) => state.editingTabId);
    const visualSelected = useTabset((state) => state.visualSelected);

    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
      onKeyDown?.(event);
      if (event.defaultPrevented) {
        return;
      }

      if (!(event.target instanceof HTMLElement) || !event.target.closest('[role="tab"]')) {
        return;
      }
      const count = node.children.length;
      if (count === 0) {
        return;
      }
      // The visual index, not the model's: focus (`tabindex="0"`) sits at that one.
      const from = Math.max(visualSelected, 0);
      const targets = new Map([
        ["ArrowLeft", (from - 1 + count) % count],
        ["ArrowRight", (from + 1) % count],
        ["End", count - 1],
        ["Home", 0],
      ]);
      const next = targets.get(event.key);
      if (next === undefined) {
        return;
      }
      event.preventDefault();
      selectTab(next, { focus: true });
    };

    const refCallback = useMemo(
      () => mergeRefs<HTMLDivElement>(registerTablist, userRef),
      [registerTablist, userRef],
    );

    const ownedTabs = node.children
      .filter((tab) => tab.id !== editingTabId)
      .map((tab) => tabDomId(node.id, tab.id))
      .join(" ");

    return (
      <div
        {...props}
        data-dashfoo="tablist"
        onKeyDown={handleKeyDown}
        ref={refCallback}
        style={{ ...tablistStyle, ...style }}
        tabIndex={-1}
      >
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
