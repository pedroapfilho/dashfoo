"use client";

import type { ComponentProps, ReactNode } from "react";
import { forwardRef } from "react";

type PanelBadgeProps = ComponentProps<"span">;

const PanelBadge = forwardRef<HTMLSpanElement, PanelBadgeProps>((props, ref): ReactNode => (
  <span {...props} data-dashfoo="panel-badge" ref={ref} />
));

PanelBadge.displayName = "PanelBadge";

export { PanelBadge };
export type { PanelBadgeProps };
