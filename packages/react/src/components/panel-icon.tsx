"use client";

import type { ComponentProps, ReactNode } from "react";

type PanelIconProps = ComponentProps<"span">;

const PanelIcon = (props: PanelIconProps): ReactNode => (
  <span {...props} data-dashfoo="panel-icon" />
);

export { PanelIcon };
export type { PanelIconProps };
