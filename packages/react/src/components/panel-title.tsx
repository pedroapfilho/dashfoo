"use client";

import type { ComponentProps, ReactNode } from "react";
import { forwardRef } from "react";

type PanelTitleProps = ComponentProps<"span">;

const PanelTitle = forwardRef<HTMLSpanElement, PanelTitleProps>((props, ref): ReactNode => (
  <span {...props} data-dashfoo="panel-title" ref={ref} />
));

PanelTitle.displayName = "PanelTitle";

export { PanelTitle };
export type { PanelTitleProps };
