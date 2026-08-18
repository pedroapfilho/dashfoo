"use client";

import type { ComponentProps, ReactNode } from "react";

type PanelBadgeProps = ComponentProps<"span">;

const PanelBadge = (props: PanelBadgeProps): ReactNode => (
  <span {...props} data-dashfoo="panel-badge" />
);

export { PanelBadge };
export type { PanelBadgeProps };
