"use client";
import * as React from "react";

import { cn } from "../../lib/cn";

type PopoverContextValue = {
  popoverId: string;
};

const PopoverContext = React.createContext<PopoverContextValue | null>(null);

export const Popover = ({ children }: { children: React.ReactNode }) => {
  const rawId = React.useId();
  // useId returns ":r0:" style strings — strip colons for a valid HTML id
  const popoverId = `fd-popover-${rawId.replaceAll(":", "")}`;
  return <PopoverContext value={{ popoverId }}>{children}</PopoverContext>;
};

type PopoverTriggerProps = React.ComponentPropsWithRef<"button">;

export const PopoverTrigger = React.forwardRef<HTMLButtonElement, PopoverTriggerProps>(
  ({ children, className, ...props }, ref) => {
    const ctx = React.use(PopoverContext);
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
  },
);
PopoverTrigger.displayName = "PopoverTrigger";

type PopoverContentProps = React.ComponentPropsWithRef<"div">;

export const PopoverContent = React.forwardRef<HTMLDivElement, PopoverContentProps>(
  ({ children, className, ...props }, ref) => {
    const ctx = React.use(PopoverContext);
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
        // popover is a valid HTML attribute in React 19+
        // eslint-disable-next-line react/no-unknown-property
        popover="auto"
      >
        {children}
      </div>
    );
  },
);
PopoverContent.displayName = "PopoverContent";
