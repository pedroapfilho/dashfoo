"use client";

import type { ComponentProps, ReactNode } from "react";
import { forwardRef } from "react";

type PanelRootProps = ComponentProps<"div">;

const PanelRoot = forwardRef<HTMLDivElement, PanelRootProps>((props, ref): ReactNode => (
  <div {...props} data-dashfoo="panel" ref={ref} />
));

PanelRoot.displayName = "PanelRoot";

export { PanelRoot };
export type { PanelRootProps };
