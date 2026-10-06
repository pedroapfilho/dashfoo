"use client";

import type { ComponentProps, ReactNode } from "react";
import { forwardRef } from "react";

type PanelBadgeProps = ComponentProps<"span">;
type PanelBodyProps = ComponentProps<"div">;
type PanelHeaderProps = ComponentProps<"div">;
type PanelIconProps = ComponentProps<"span">;
type PanelRootProps = ComponentProps<"div">;
type PanelTitleProps = ComponentProps<"span">;

const PanelBadge = forwardRef<HTMLSpanElement, PanelBadgeProps>((props, ref): ReactNode => (
  <span {...props} data-dashfoo="panel-badge" ref={ref} />
));
PanelBadge.displayName = "PanelBadge";

const PanelBody = forwardRef<HTMLDivElement, PanelBodyProps>((props, ref): ReactNode => (
  <div {...props} data-dashfoo="panel-body" ref={ref} tabIndex={props.tabIndex ?? 0} />
));
PanelBody.displayName = "PanelBody";

const PanelHeader = forwardRef<HTMLDivElement, PanelHeaderProps>((props, ref): ReactNode => (
  <div {...props} data-dashfoo="panel-header" ref={ref} />
));
PanelHeader.displayName = "PanelHeader";

const PanelIcon = forwardRef<HTMLSpanElement, PanelIconProps>((props, ref): ReactNode => (
  <span {...props} data-dashfoo="panel-icon" ref={ref} />
));
PanelIcon.displayName = "PanelIcon";

const PanelRoot = forwardRef<HTMLDivElement, PanelRootProps>((props, ref): ReactNode => (
  <div {...props} data-dashfoo="panel" ref={ref} />
));
PanelRoot.displayName = "PanelRoot";

const PanelTitle = forwardRef<HTMLSpanElement, PanelTitleProps>((props, ref): ReactNode => (
  <span {...props} data-dashfoo="panel-title" ref={ref} />
));
PanelTitle.displayName = "PanelTitle";

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
