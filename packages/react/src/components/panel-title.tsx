"use client";

import type { ComponentProps, ReactNode } from "react";

type PanelTitleProps = ComponentProps<"span">;

const PanelTitle = (props: PanelTitleProps): ReactNode => (
  <span {...props} data-dashfoo="panel-title" />
);

export { PanelTitle };
export type { PanelTitleProps };
