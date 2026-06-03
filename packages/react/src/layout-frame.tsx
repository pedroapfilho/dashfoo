"use client";

import type { Dashfoo } from "@dashfoo/core";
import { findTabset } from "@dashfoo/core";
import type { ReactNode } from "react";

import { RowView } from "./row-view";
import { TabsetView } from "./tabset-view";

// The frame between the document model and the views. When a live tabset is
// maximized it fills the whole area on its own; otherwise the row tree renders.
const LayoutFrame = ({ model }: { model: Dashfoo }): ReactNode => {
  const maximized = model.maximizedTabsetId
    ? findTabset(model, model.maximizedTabsetId)
    : undefined;

  if (maximized) {
    return <TabsetView node={maximized} />;
  }

  return <RowView node={model.layout} />;
};

export { LayoutFrame };
