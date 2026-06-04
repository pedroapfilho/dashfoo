"use client";

import type { CSSProperties, ReactNode, RefObject } from "react";
import { useEffect, useRef, useState } from "react";

// The ids of the tabs whose right edge is past the tablist's visible right edge
// (i.e. clipped). +1 absorbs sub-pixel rounding.
const overflowingIds = (tablist: Element): Array<string> => {
  const rightEdge = tablist.getBoundingClientRect().right;
  return [...tablist.querySelectorAll<HTMLElement>('[data-dashfoo="tab"]')]
    .filter((tab) => tab.getBoundingClientRect().right > rightEdge + 1)
    .map((tab) => tab.dataset.tabId ?? "")
    .filter(Boolean);
};

// Recomputes the overflowing ids when the tablist resizes or its tab count
// changes. Returns [] until measured (and in jsdom, where rects are 0).
const useTabOverflow = (
  tablistRef: RefObject<HTMLElement | null>,
  tabCount: number,
): Array<string> => {
  const [overflow, setOverflow] = useState<Array<string>>([]);

  useEffect(() => {
    const element = tablistRef.current;
    if (!element) {
      return;
    }
    const recompute = (): void => {
      setOverflow(overflowingIds(element));
    };
    recompute();
    const observer = new ResizeObserver(recompute);
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, [tablistRef, tabCount]);

  return overflow;
};

const OverflowIcon = (): ReactNode => (
  <svg aria-hidden="true" fill="currentColor" height="10" viewBox="0 0 10 10" width="10">
    <circle cx="2" cy="5" r="1" />
    <circle cx="5" cy="5" r="1" />
    <circle cx="8" cy="5" r="1" />
  </svg>
);

const menuStyle: CSSProperties = {
  position: "absolute",
  right: 0,
  top: "100%",
  zIndex: 10,
};

type OverflowItem = { id: string; name: string };

const TabOverflowItem = ({
  item,
  onSelect,
}: {
  item: OverflowItem;
  onSelect: (id: string) => void;
}): ReactNode => {
  const handleClick = (): void => {
    onSelect(item.id);
  };

  return (
    <button data-dashfoo="tab-overflow-item" onClick={handleClick} role="menuitem" type="button">
      {item.name}
    </button>
  );
};

// A dependency-free overflow control: a button that toggles a menu of the hidden
// tabs. Closes on outside pointerdown and Escape.
const TabOverflowMenu = ({
  items,
  onSelect,
}: {
  items: Array<OverflowItem>;
  onSelect: (id: string) => void;
}): ReactNode => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const handlePointerDown = (event: PointerEvent): void => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const handleToggle = (): void => {
    setOpen((value) => !value);
  };

  const handleSelect = (id: string): void => {
    onSelect(id);
    setOpen(false);
  };

  return (
    <div data-dashfoo="tab-overflow-root" ref={rootRef} style={{ position: "relative" }}>
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="More tabs"
        data-dashfoo="tab-overflow"
        onClick={handleToggle}
        type="button"
      >
        <OverflowIcon />
      </button>
      {open ? (
        <div data-dashfoo="tab-overflow-menu" role="menu" style={menuStyle}>
          {items.map((item) => (
            <TabOverflowItem item={item} key={item.id} onSelect={handleSelect} />
          ))}
        </div>
      ) : null}
    </div>
  );
};

export { overflowingIds, TabOverflowMenu, useTabOverflow };
export type { OverflowItem };
