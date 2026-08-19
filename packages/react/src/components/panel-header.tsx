"use client";

import type { ComponentProps, ReactNode } from "react";

type PanelHeaderProps = ComponentProps<"div">;

const PanelHeader = (props: PanelHeaderProps): ReactNode => (
  <div {...props} data-dashfoo="panel-header" />
);

export { PanelHeader };
export type { PanelHeaderProps };
