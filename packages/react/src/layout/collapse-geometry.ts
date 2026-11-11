import type { RowNode } from "@dashfoo/core";
import type { PanelImperativeHandle } from "react-resizable-panels";

const sameSet = (a: ReadonlySet<string>, b: ReadonlySet<string>): boolean =>
  a.size === b.size && [...a].every((id) => b.has(id));

/**
 * The strip's thickness plus the tabset's border, which a collapsed panel
 * still shows. Collapsed in a side-by-side split the strip runs vertically,
 * so its thickness is its width.
 */
const measureHeader = (panel: HTMLElement): number | undefined => {
  const tabset = panel.querySelector<HTMLElement>('[data-dashfoo="tabset"]');
  const strip = tabset?.querySelector<HTMLElement>('[data-dashfoo="tabstrip"]');

  if (!tabset) {
    return undefined;
  }

  if (tabset.dataset.collapsed === "row") {
    return (strip?.offsetWidth ?? 0) + tabset.offsetWidth - tabset.clientWidth;
  }

  return (strip?.offsetHeight ?? 0) + tabset.offsetHeight - tabset.clientHeight;
};

/**
 * rrp's `expand()` restores the size a panel had before it collapsed, and does
 * nothing when that size was already below the minimum.
 */
const expandToMinimum = (handle: PanelImperativeHandle, minimum: number | undefined): void => {
  if (handle.isCollapsed() && minimum !== undefined) {
    handle.resize(`${minimum}px`);
  }
};

/** Read from the DOM, not from rrp, whose sizes lag a container resize. */
const spaceForPanels = (group: HTMLElement, orientation: RowNode["orientation"]): number => {
  const sizeOf = (element: Element): number => {
    const rect = element.getBoundingClientRect();

    return orientation === "row" ? rect.width : rect.height;
  };

  let space = sizeOf(group);

  for (const separator of group.querySelectorAll(":scope > [data-separator]")) {
    space -= sizeOf(separator);
  }

  return space;
};

/**
 * A collapsed child's weight is the share it expands back to, so a resize
 * keeps it and rescales the expanded children into the units they had.
 */
const keepCollapsedWeights = (
  node: RowNode,
  sizes: Array<number>,
  collapsedIds: ReadonlySet<string>,
): Array<number> => {
  if (collapsedIds.size === 0) {
    return sizes;
  }

  let oldTotal = 0;
  let newTotal = 0;

  for (const [index, child] of node.children.entries()) {
    if (!collapsedIds.has(child.id)) {
      oldTotal += child.weight;
      newTotal += sizes[index] ?? 0;
    }
  }

  const scale = newTotal > 0 ? oldTotal / newTotal : 1;

  return node.children.map((child, index) =>
    collapsedIds.has(child.id) ? child.weight : (sizes[index] ?? 0) * scale,
  );
};

export { expandToMinimum, keepCollapsedWeights, measureHeader, sameSet, spaceForPanels };
