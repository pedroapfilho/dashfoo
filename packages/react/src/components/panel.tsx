"use client";

import type { ComponentProps, ReactNode } from "react";

type PanelRootProps = ComponentProps<"div">;
type PanelHeaderProps = ComponentProps<"div">;
type PanelBodyProps = ComponentProps<"div">;
type PanelTitleProps = ComponentProps<"span">;
type PanelIconProps = ComponentProps<"span">;
type PanelBadgeProps = ComponentProps<"span">;

const PanelRoot = (props: PanelRootProps): ReactNode => <div {...props} data-dashfoo="panel" />;
const PanelHeader = (props: PanelHeaderProps): ReactNode => (
  <div {...props} data-dashfoo="panel-header" />
);
const PanelBody = (props: PanelBodyProps): ReactNode => (
  <div {...props} data-dashfoo="panel-body" />
);
const PanelTitle = (props: PanelTitleProps): ReactNode => (
  <span {...props} data-dashfoo="panel-title" />
);
const PanelIcon = (props: PanelIconProps): ReactNode => (
  <span {...props} data-dashfoo="panel-icon" />
);
const PanelBadge = (props: PanelBadgeProps): ReactNode => (
  <span {...props} data-dashfoo="panel-badge" />
);

const Panel = {
  Badge: PanelBadge,
  Body: PanelBody,
  Header: PanelHeader,
  Icon: PanelIcon,
  Root: PanelRoot,
  Title: PanelTitle,
} as const;

export { Panel };
export type {
  PanelBadgeProps,
  PanelBodyProps,
  PanelHeaderProps,
  PanelIconProps,
  PanelRootProps,
  PanelTitleProps,
};
