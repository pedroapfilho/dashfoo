"use client";

import type { ComponentProps, ReactNode } from "react";

type PanelRootProps = ComponentProps<"div">;

const PanelRoot = (props: PanelRootProps): ReactNode => <div {...props} data-dashfoo="panel" />;

export { PanelRoot };
export type { PanelRootProps };
