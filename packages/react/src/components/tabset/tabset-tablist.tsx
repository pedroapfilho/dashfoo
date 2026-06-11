"use client";

import type { ComponentProps, CSSProperties, KeyboardEvent, ReactNode } from "react";
import { useMemo } from "react";

import { mergeRefs } from "../../lib/merge-refs";

import { useTabset } from "./tabset-store";

// The strip is a presentational row: the tablist (the actual tabs) plus room for
// a trailing toolbar. role="tablist" lives on the inner tablist so the toolbar is
// not announced as a tab. The drag adapter hit-tests [data-dashfoo="tabstrip"],
// so the attribute is applied after the spread — it is structural, not theming.
const stripStyle: CSSProperties = { display: "flex", flexShrink: 0 };

const tablistStyle: CSSProperties = { display: "flex", minWidth: 0, overflowX: "auto" };

type TabsetTabStripProps = ComponentProps<"div">;

const TabsetTabStrip = ({ style, ...props }: TabsetTabStripProps): ReactNode => (
  <div {...props} data-dashfoo="tabstrip" style={{ ...stripStyle, ...style }} />
);

type TabsetTablistProps = ComponentProps<"div">;

// Owns the roving-tabindex keyboard model (WAI-ARIA APG Tabs): arrows move and
// select, Home/End jump to the ends, and focus follows the new selection.
const TabsetTablist = ({
  onKeyDown,
  ref: userRef,
  style,
  ...props
}: TabsetTablistProps): ReactNode => {
  const node = useTabset((state) => state.node);
  const registerTablist = useTabset((state) => state.registerTablist);
  const selectTab = useTabset((state) => state.selectTab);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    onKeyDown?.(event);
    if (event.defaultPrevented) {
      return;
    }
    // Only act when the key comes from a tab — otherwise a focused close button
    // (a tablist child) would have its arrows/Home/End hijacked.
    if (!(event.target instanceof HTMLElement) || !event.target.closest('[role="tab"]')) {
      return;
    }
    const count = node.children.length;
    if (count === 0) {
      return;
    }
    const targets: Record<string, number> = {
      ArrowLeft: (node.selected - 1 + count) % count,
      ArrowRight: (node.selected + 1) % count,
      End: count - 1,
      Home: 0,
    };
    const next = targets[event.key];
    if (next === undefined) {
      return;
    }
    event.preventDefault();
    selectTab(next, { focus: true });
  };

  // Stable callback ref so React doesn't detach/re-register the tablist on every
  // render (a fresh inline ref identity would churn the store registration).
  const refCallback = useMemo(
    () => mergeRefs<HTMLDivElement>(registerTablist, userRef),
    [registerTablist, userRef],
  );

  return (
    <div
      aria-label={node.name ?? "Tabs"}
      {...props}
      aria-orientation="horizontal"
      data-dashfoo="tablist"
      onKeyDown={handleKeyDown}
      ref={refCallback}
      role="tablist"
      style={{ ...tablistStyle, ...style }}
      tabIndex={-1}
    />
  );
};

export { TabsetTablist, TabsetTabStrip };
export type { TabsetTablistProps, TabsetTabStripProps };
