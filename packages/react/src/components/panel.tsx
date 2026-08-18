"use client";

import { PanelBadge } from "./panel-badge";
import { PanelBody } from "./panel-body";
import { PanelHeader } from "./panel-header";
import { PanelIcon } from "./panel-icon";
import { PanelRoot } from "./panel-root";
import { PanelTitle } from "./panel-title";

const Panel = {
  Badge: PanelBadge,
  Body: PanelBody,
  Header: PanelHeader,
  Icon: PanelIcon,
  Root: PanelRoot,
  Title: PanelTitle,
} as const;

export { Panel };
export type { PanelBadgeProps } from "./panel-badge";
export type { PanelBodyProps } from "./panel-body";
export type { PanelHeaderProps } from "./panel-header";
export type { PanelIconProps } from "./panel-icon";
export type { PanelRootProps } from "./panel-root";
export type { PanelTitleProps } from "./panel-title";
