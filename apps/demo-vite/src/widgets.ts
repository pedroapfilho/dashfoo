import type { Dashfoo, TabNode } from "@dashfoo/core";
import { createNodeId, getFirstTabset, tab } from "@dashfoo/core";
import type { LucideIcon } from "lucide-react";
import { Activity, Bell, FileText, Gauge, History, StickyNote } from "lucide-react";

type WidgetDefinition = { component: string; icon: LucideIcon; name: string };

const WIDGETS: Array<WidgetDefinition> = [
  { component: "activity", icon: Activity, name: "Activity" },
  { component: "metrics", icon: Gauge, name: "Metrics" },
  { component: "history", icon: History, name: "History" },
  { component: "reports", icon: FileText, name: "Reports" },
  { component: "notes", icon: StickyNote, name: "Notes" },
  { component: "alerts", icon: Bell, name: "Alerts" },
];

const createWidgetTab = (widget: WidgetDefinition): TabNode =>
  tab(widget.component, widget.name, { id: createNodeId(widget.component) });

const addTargetId = (model: Dashfoo): string | undefined =>
  model.activeTabsetId ?? getFirstTabset(model)?.id;

export { addTargetId, createWidgetTab, WIDGETS };
export type { WidgetDefinition };
