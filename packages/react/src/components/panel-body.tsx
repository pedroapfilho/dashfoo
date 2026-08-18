"use client";

import type { ComponentProps, ReactNode } from "react";

type PanelBodyProps = ComponentProps<"div">;

const PanelBody = (props: PanelBodyProps): ReactNode => (
  <div {...props} data-dashfoo="panel-body" />
);

export { PanelBody };
export type { PanelBodyProps };
