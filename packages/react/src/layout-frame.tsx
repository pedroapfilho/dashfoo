"use client";

import type { Dashfoo, Edge } from "@dashfoo/core";
import { findTabset } from "@dashfoo/core";
import type { CSSProperties, ReactNode } from "react";

import { BorderView } from "./border-view";
import { RowView } from "./row-view";
import { TabsetView } from "./tabset-view";

// Left/right borders span the full height (rows 1–3); top/bottom sit between
// them (column 2). The center document fills the middle cell.
const frameStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "auto 1fr auto",
  gridTemplateRows: "auto 1fr auto",
  height: "100%",
  minHeight: 0,
  minWidth: 0,
  width: "100%",
};

const edgeArea: Record<Edge, CSSProperties> = {
  bottom: { gridColumn: 2, gridRow: 3, minWidth: 0 },
  left: { gridColumn: 1, gridRow: "1 / 4", minHeight: 0 },
  right: { gridColumn: 3, gridRow: "1 / 4", minHeight: 0 },
  top: { gridColumn: 2, gridRow: 1, minWidth: 0 },
};

const centerArea: CSSProperties = { gridColumn: 2, gridRow: 2, minHeight: 0, minWidth: 0 };

// The frame between the document model and the views. When a live tabset is
// maximized it fills the whole area on its own (no borders); otherwise the row
// tree renders, wrapped in a border frame when the model has any borders.
const LayoutFrame = ({ model }: { model: Dashfoo }): ReactNode => {
  const maximized = model.maximizedTabsetId
    ? findTabset(model, model.maximizedTabsetId)
    : undefined;

  if (maximized) {
    return <TabsetView node={maximized} />;
  }

  const center = <RowView node={model.layout} />;

  if (model.borders.length === 0) {
    return center;
  }

  return (
    <div data-dashfoo="frame" style={frameStyle}>
      {model.borders.map((border) => (
        <div key={border.edge} style={edgeArea[border.edge]}>
          <BorderView node={border} />
        </div>
      ))}
      <div style={centerArea}>{center}</div>
    </div>
  );
};

export { LayoutFrame };
