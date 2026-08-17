"use client";

import type { ComponentProps, CSSProperties, KeyboardEvent, ReactNode } from "react";
import { useMemo } from "react";

import { mergeRefs } from "../../lib/merge-refs";

import { useTabset } from "./tabset-store";

const stripStyle: CSSProperties = { display: "flex", flexShrink: 0 };

const tablistStyle: CSSProperties = { display: "flex", minWidth: 0, overflowX: "auto" };

type TabsetTabStripProps = ComponentProps<"div">;

const TabsetTabStrip = ({ style, ...props }: TabsetTabStripProps): ReactNode => (
  <div {...props} data-dashfoo="tabstrip" style={{ ...stripStyle, ...style }} />
);

type TabsetTablistProps = ComponentProps<"div">;

const TabsetTablist = ({
  onKeyDown,
  ref: userRef,
  style,
  ...props
}: TabsetTablistProps): ReactNode => {
  const node = useTabset((state) => state.node);
  const registerTablist = useTabset((state) => state.registerTablist);
  const selectTab = useTabset((state) => state.selectTab);
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
    const targets: Record<string, number> = {
      ArrowLeft: (from - 1 + count) % count,
      ArrowRight: (from + 1) % count,
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
