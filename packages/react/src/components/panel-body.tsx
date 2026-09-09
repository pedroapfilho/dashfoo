// oxlint-disable jsx-a11y/no-noninteractive-tabindex -- The themed body is an independent scroll region and needs keyboard access.
"use client";

import type { ComponentProps, ReactNode } from "react";
import { forwardRef } from "react";

type PanelBodyProps = ComponentProps<"div">;

const PanelBody = forwardRef<HTMLDivElement, PanelBodyProps>((props, ref): ReactNode => (
  <div {...props} data-dashfoo="panel-body" ref={ref} tabIndex={props.tabIndex ?? 0} />
));

PanelBody.displayName = "PanelBody";

export { PanelBody };
export type { PanelBodyProps };
