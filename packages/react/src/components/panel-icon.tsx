"use client";

import type { ComponentProps, ReactNode } from "react";
import { forwardRef } from "react";

type PanelIconProps = ComponentProps<"span">;

const PanelIcon = forwardRef<HTMLSpanElement, PanelIconProps>((props, ref): ReactNode => (
  <span {...props} data-dashfoo="panel-icon" ref={ref} />
));

PanelIcon.displayName = "PanelIcon";

export { PanelIcon };
export type { PanelIconProps };
