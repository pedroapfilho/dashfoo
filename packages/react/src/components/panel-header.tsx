"use client";

import type { ComponentProps, ReactNode } from "react";
import { forwardRef } from "react";

type PanelHeaderProps = ComponentProps<"div">;

const PanelHeader = forwardRef<HTMLDivElement, PanelHeaderProps>((props, ref): ReactNode => (
  <div {...props} data-dashfoo="panel-header" ref={ref} />
));

PanelHeader.displayName = "PanelHeader";

export { PanelHeader };
export type { PanelHeaderProps };
