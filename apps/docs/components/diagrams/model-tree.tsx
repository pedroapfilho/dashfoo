import type { ReactNode } from "react";

import { cn } from "../../lib/cn";

import { DiagramFigure, IdChip } from "./diagram-figure";

type NodeKind = "Dashfoo" | "float" | "row" | "tab" | "tabset";

const KIND_STYLES: Record<NodeKind, string> = {
  Dashfoo: "bg-fd-primary text-fd-primary-foreground",
  float: "border bg-fd-secondary text-fd-secondary-foreground",
  row: "border bg-fd-secondary text-fd-secondary-foreground",
  tab: "border text-fd-muted-foreground",
  tabset: "border bg-fd-muted text-fd-foreground",
};

type TreeNodeProps = {
  children?: ReactNode;
  field?: string;
  id?: string;
  kind: NodeKind;
  meta?: string;
};

const TreeNode = ({ children, field, id, kind, meta }: TreeNodeProps) => (
  <li>
    <div className="flex flex-wrap items-center gap-1.5 py-0.5">
      {field ? (
        <span className="text-fd-muted-foreground font-mono text-[11px]">{field}:</span>
      ) : null}
      <span className={cn("rounded px-1.5 font-mono text-[10px] leading-4.5", KIND_STYLES[kind])}>
        {kind}
      </span>
      {id ? <IdChip>{id}</IdChip> : null}
      {meta ? <span className="text-fd-muted-foreground font-mono text-[10px]">{meta}</span> : null}
    </div>
    {children ? <ul className="ml-2 border-l pl-4">{children}</ul> : null}
  </li>
);

const ModelTree = () => (
  <DiagramFigure
    caption="One serializable object: the anatomy figure above, as data. The grey id badges match the figure; floats sit next to the tiled tree, each owning a layout subtree of the same shape."
    label="The anatomy figure as its Dashfoo model tree"
  >
    <ul className="min-w-80 text-sm">
      <TreeNode kind="Dashfoo" meta='version: 1 · activeTabsetId: "ts-main"'>
        <TreeNode field="layout" id="root" kind="row" meta='orientation: "row"'>
          <TreeNode id="ts-main" kind="tabset" meta="weight: 2 · selected: 0">
            <TreeNode kind="tab" meta='name: "Canvas" · component: "canvas"' />
            <TreeNode kind="tab" meta='name: "Detail" · component: "detail"' />
          </TreeNode>
          <TreeNode id="right" kind="row" meta='orientation: "column" · weight: 1'>
            <TreeNode id="ts-side-top" kind="tabset" meta="weight: 1">
              <TreeNode kind="tab" meta='name: "Activity"' />
              <TreeNode kind="tab" meta='name: "Tasks"' />
            </TreeNode>
            <TreeNode id="ts-side-bottom" kind="tabset" meta="weight: 1">
              <TreeNode kind="tab" meta='name: "Metrics"' />
              <TreeNode kind="tab" meta='name: "History"' />
              <TreeNode kind="tab" meta='name: "Reports"' />
            </TreeNode>
          </TreeNode>
        </TreeNode>
        <TreeNode
          field="floats[0]"
          kind="float"
          meta='name: "Notes" · geometry: { left, top, width, height }'
        >
          <TreeNode field="layout" kind="row" meta='orientation: "row"'>
            <TreeNode kind="tabset" meta="selected: 0">
              <TreeNode kind="tab" meta='name: "Scratch"' />
            </TreeNode>
          </TreeNode>
        </TreeNode>
      </TreeNode>
    </ul>
  </DiagramFigure>
);

export { ModelTree };
