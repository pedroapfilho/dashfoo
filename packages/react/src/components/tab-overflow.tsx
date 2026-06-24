"use client";

import type { CSSProperties, FocusEvent, KeyboardEvent, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

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

// A dependency-free overflow control: a button that toggles a menu of the hidden
// tabs. Implements the WAI-ARIA APG menu-button keyboard model — roving tabindex,
// arrow/Home/End navigation, Escape-to-close with focus return. Closes on outside
// pointerdown and focusout.
const TabOverflowMenu = ({
  items,
  onSelect,
}: {
  items: Array<OverflowItem>;
  onSelect: (id: string) => void;
}): ReactNode => {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const handlePointerDown = (event: PointerEvent): void => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [open]);

  // moving DOM focus onto the first menuitem is a side effect of the menu becoming
  // visible, so it belongs in an effect rather than the click handler (the items don't
  // exist yet there). activeIndex is reset to 0 on open, so we always land on the first.
  useEffect(() => {
    if (open) {
      itemRefs.current[0]?.focus();
    }
  }, [open]);

  const closeAndReturnFocus = (): void => {
    setOpen(false);
    triggerRef.current?.focus();
  };

  const focusItem = (index: number): void => {
    setActiveIndex(index);
    itemRefs.current[index]?.focus();
  };

  const handleToggle = (): void => {
    setActiveIndex(0);
    setOpen((value) => !value);
  };

  const handleSelect = (id: string): void => {
    onSelect(id);
    closeAndReturnFocus();
  };

  const handleMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const last = items.length - 1;
    switch (event.key) {
      case "ArrowDown": {
        event.preventDefault();
        focusItem(activeIndex >= last ? 0 : activeIndex + 1);
        break;
      }
      case "ArrowUp": {
        event.preventDefault();
        focusItem(activeIndex <= 0 ? last : activeIndex - 1);
        break;
      }
      case "Home": {
        event.preventDefault();
        focusItem(0);
        break;
      }
      case "End": {
        event.preventDefault();
        focusItem(last);
        break;
      }
      case "Escape": {
        event.preventDefault();
        closeAndReturnFocus();
        break;
      }
      default: {
        break;
      }
    }
  };

  // Tab out of the menu (or any other focus leaving the root) closes it without
  // stealing focus, complementing the outside-pointerdown handler for keyboard users.
  const handleFocusOut = (event: FocusEvent<HTMLDivElement>): void => {
    if (event.relatedTarget instanceof Node && rootRef.current?.contains(event.relatedTarget)) {
      return;
    }
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
        ref={triggerRef}
        title="More tabs"
        type="button"
      >
        <OverflowIcon />
      </button>
      {open ? (
        <div
          data-dashfoo="tab-overflow-menu"
          onBlur={handleFocusOut}
          onKeyDown={handleMenuKeyDown}
          role="menu"
          style={menuStyle}
          tabIndex={-1}
        >
          {items.map((item, index) => (
            <button
              data-dashfoo="tab-overflow-item"
              key={item.id}
              onClick={() => handleSelect(item.id)}
              ref={(node) => {
                itemRefs.current[index] = node;
              }}
              role="menuitem"
              tabIndex={index === activeIndex ? 0 : -1}
              type="button"
            >
              {item.name}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
};

export { TabOverflowMenu };
export type { OverflowItem };
