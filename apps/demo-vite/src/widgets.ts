import type { Dashfoo, TabNode } from "@dashfoo/core";
import { createNodeId, findTabset, getFirstTabset, tab } from "@dashfoo/core";
import type { DashfooHandle } from "@dashfoo/react";
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

const addWidget = (handle: DashfooHandle | null, widget: WidgetDefinition): void => {
  if (!handle) {
    return;
  }
  const targetId = addTargetId(handle.getModel());
  if (targetId) {
    handle.addTab(createWidgetTab(widget), { location: "center", targetId });
  }
};

const closeActiveTab = (handle: DashfooHandle | null): void => {
  if (!handle) {
    return;
  }
  const model = handle.getModel();
  const targetId = addTargetId(model);
  const tabset = targetId === undefined ? undefined : findTabset(model, targetId);
  const activeTab = tabset?.children[tabset.selected ?? 0];
  if (activeTab) {
    handle.closeTab(activeTab.id);
  }
};

export { addTargetId, addWidget, closeActiveTab, createWidgetTab, WIDGETS };
export type { WidgetDefinition };
