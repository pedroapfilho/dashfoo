import type { RowNode, TabsetNode } from "../model/schema";

type RowChild = RowNode["children"][number];

const isCollapsed = (child: RowChild): boolean =>
  child.type === "tabset" && child.collapsed === true;

/**
 * A split needs one expanded child to take the space its collapsed siblings
 * give up, so the last expanded child of a row cannot collapse.
 */
const canCollapseTabset = (parent: RowNode, tabset: TabsetNode): boolean =>
  tabset.collapsible === true &&
  parent.children.some((child) => child !== tabset && !isCollapsed(child));

export { canCollapseTabset, isCollapsed };
