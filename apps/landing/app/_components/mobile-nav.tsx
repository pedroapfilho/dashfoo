"use client";

import { Menu, X } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useId, useRef, useState } from "react";

import { EXTERNAL_LINKS, SECTION_LINKS } from "./nav-links";

const LINK_CLASS =
  "text-dashfoo-muted-foreground hover:bg-dashfoo-muted hover:text-dashfoo-foreground rounded-dashfoo-sm focus-visible:outline-dashfoo-ring px-3 py-2.5 text-base font-medium focus-visible:outline-2 focus-visible:outline-offset-2";

const MobileNav = (): ReactNode => {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const panelRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Subscribed unconditionally rather than gated on `open`: closing an already
  // closed disclosure is a no-op React bails out of, and a single stable
  // listener avoids re-subscribing on every toggle. Reading focus off the refs
  // at event time rather than from state keeps the dep array empty.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== "Escape") {
        return;
      }
      // Only reclaim focus that the closing panel is about to orphan. Escape
      // pressed while focus sits elsewhere on the page must not yank it back
      // to the trigger. Focusing before the state update is safe: the panel is
      // still mounted, so React unmounting it afterwards cannot move focus.
      const orphansFocus =
        panelRef.current?.contains(document.activeElement) === true ||
        document.activeElement === triggerRef.current;
      if (orphansFocus) {
        triggerRef.current?.focus();
      }
      setOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleToggle = (): void => {
    setOpen((previous) => !previous);
  };

  const handleNavigate = (): void => {
    setOpen(false);
  };

  return (
    <>
      <button
        aria-controls={panelId}
        aria-expanded={open}
        aria-label="Menu"
        className="text-dashfoo-muted-foreground hover:bg-dashfoo-muted hover:text-dashfoo-foreground rounded-dashfoo-sm focus-visible:outline-dashfoo-ring relative shrink-0 p-2 focus-visible:outline-2 focus-visible:outline-offset-2 lg:hidden"
        onClick={handleToggle}
        ref={triggerRef}
        type="button"
      >
        {open ? (
          <X className="size-5 shrink-0" strokeWidth={1.75} />
        ) : (
          <Menu className="size-5 shrink-0" strokeWidth={1.75} />
        )}
        <span
          aria-hidden="true"
          className="absolute top-1/2 left-1/2 size-[max(100%,3rem)] -translate-1/2 pointer-fine:hidden"
        />
      </button>
      {/*
       * A disclosure, not a dialog: the panel sits in the flow below the header
       * and leaves the page reachable, so it needs no focus trap. The sticky
       * header is the positioned ancestor `top-full` resolves against.
       */}
      {open ? (
        <nav
          aria-label="Mobile"
          className="border-dashfoo-border/70 bg-dashfoo-background absolute inset-x-0 top-full flex flex-col border-b px-6 py-3 lg:hidden"
          id={panelId}
          ref={panelRef}
        >
          {[...SECTION_LINKS, ...EXTERNAL_LINKS].map((link) => {
            const isAnchor = link.href.startsWith("#");
            return (
              <a
                className={LINK_CLASS}
                href={link.href}
                key={link.href}
                onClick={handleNavigate}
                rel={isAnchor ? undefined : "noopener noreferrer"}
                target={isAnchor ? undefined : "_blank"}
              >
                {link.label}
              </a>
            );
          })}
        </nav>
      ) : null}
    </>
  );
};

export { MobileNav };
