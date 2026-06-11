import type { Dashfoo, TabNode } from "@dashfoo/core";
import { createNodeId, getFirstTabset, tab } from "@dashfoo/core";
import type { LucideIcon } from "lucide-react";
import { Activity, Bell, FileText, Gauge, History, StickyNote } from "lucide-react";

type WidgetDefinition = { component: string; icon: LucideIcon; name: string };

// The "marketplace": every widget the host app offers the dashboard. Shared by
// the docking page (drag-in) and the imperative page (addTab) so both insert
// the same tabs.
const WIDGETS: Array<WidgetDefinition> = [
  { component: "activity", icon: Activity, name: "Activity" },
  { component: "metrics", icon: Gauge, name: "Metrics" },
  { component: "history", icon: History, name: "History" },
  { component: "reports", icon: FileText, name: "Reports" },
  { component: "notes", icon: StickyNote, name: "Notes" },
  { component: "alerts", icon: Bell, name: "Alerts" },
];

// Each insertion needs a fresh id — the same widget can be added many times,
// and duplicate ids would violate the model's invariants.
const createWidgetTab = (widget: WidgetDefinition): TabNode =>
  tab(widget.component, widget.name, { id: createNodeId(widget.component) });

// Where an imperative add should land: the focused tabset, else the first one
// (e.g. right after the active tabset was deleted).
const addTargetId = (model: Dashfoo): string | undefined =>
  model.activeTabsetId ?? getFirstTabset(model)?.id;

export { addTargetId, createWidgetTab, WIDGETS };
export type { WidgetDefinition };
