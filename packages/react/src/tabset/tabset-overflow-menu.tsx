"use client";

import type { FocusEvent, KeyboardEvent, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

import { OverflowIcon } from "../ui/icons";

import type { OverflowItem } from "./tabset-store";
import { useTabset } from "./tabset-store";
import { useTabsetChrome } from "./tabset-toolbar";

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
      return undefined;
    }

    const handlePointerDown = (event: PointerEvent): void => {
      if (event.target instanceof Node && rootRef.current?.contains(event.target) !== true) {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [open]);

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

  const handleFocusOut = (event: FocusEvent<HTMLDivElement>): void => {
    if (
      event.relatedTarget instanceof Node &&
      rootRef.current?.contains(event.relatedTarget) === true
    ) {
      return;
    }

    setOpen(false);
  };

  return (
    <div data-dashfoo="tab-overflow-root" ref={rootRef}>
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
          tabIndex={-1}
        >
          {items.map((item, index) => (
            <button
              data-dashfoo="tab-overflow-item"
              key={item.id}
              onClick={() => {
                handleSelect(item.id);
              }}
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

const TabsetOverflowMenu = (): ReactNode => {
  const overflowItems = useTabset((state) => state.overflowItems);
  const selectOverflowTab = useTabset((state) => state.selectOverflowTab);
  const { overflow } = useTabsetChrome();

  if (!overflow) {
    return null;
  }

  return <TabOverflowMenu items={overflowItems} onSelect={selectOverflowTab} />;
};

export { TabOverflowMenu, TabsetOverflowMenu };
