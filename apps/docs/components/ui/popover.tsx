"use client";
/* oxlint-disable react-doctor/no-multi-comp -- the popover is one compound
   primitive in three parts; splitting trigger/content into separate files
   would be a worse abstraction than the standard single-file pattern. */
import type { ComponentPropsWithRef, ReactNode } from "react";
import { createContext, use, useId, useMemo } from "react";

import { cn } from "../../lib/cn";

type PopoverContextValue = {
  popoverId: string;
};

const PopoverContext = createContext<PopoverContextValue | null>(null);

const Popover = ({ children }: { children: ReactNode }) => {
  const rawId = useId();
  // useId returns ":r0:" style strings — strip colons for a valid HTML id
  const popoverId = `fd-popover-${rawId.replaceAll(":", "")}`;
  const contextValue = useMemo<PopoverContextValue>(() => ({ popoverId }), [popoverId]);
  return <PopoverContext value={contextValue}>{children}</PopoverContext>;
};

type PopoverTriggerProps = ComponentPropsWithRef<"button">;

const PopoverTrigger = ({ children, className, ref, ...props }: PopoverTriggerProps) => {
  const ctx = use(PopoverContext);
  if (!ctx) {
    throw new Error("PopoverTrigger must be used inside Popover");
  }
  return (
    <button
      ref={ref}
      type="button"
      {...props}
      className={cn("[anchor-name:--fd-popover-anchor]", className)}
      popoverTarget={ctx.popoverId}
    >
      {children}
    </button>
  );
};

type PopoverContentProps = ComponentPropsWithRef<"div">;

const PopoverContent = ({ children, className, ref, ...props }: PopoverContentProps) => {
  const ctx = use(PopoverContext);
  if (!ctx) {
    throw new Error("PopoverContent must be used inside Popover");
  }
  return (
    <div
      ref={ref}
      {...props}
      className={cn(
        // reset native popover UA margin; hide when not open
        "m-0 [&:not(:popover-open)]:hidden",
        // visual styles
        "bg-fd-popover/60 text-fd-popover-foreground z-50 max-w-[98vw] min-w-[240px] overflow-y-auto rounded-xl border p-2 text-sm shadow-lg backdrop-blur-lg",
        // CSS Anchor Positioning: place below the trigger
        "mt-1 [position-anchor:--fd-popover-anchor] [position-area:block-end_span-inline] [position-try-fallbacks:flip-block]",
        className,
      )}
      id={ctx.popoverId}
      popover="auto"
    >
      {children}
    </div>
  );
};

export { Popover, PopoverContent, PopoverTrigger };
