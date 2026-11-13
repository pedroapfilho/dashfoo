import type { RowNode } from "@dashfoo/core";
import type { PanelImperativeHandle } from "react-resizable-panels";

import { childParts, ownPart, PART, partsIn } from "../lib/parts";

const sameSet = (a: ReadonlySet<string>, b: ReadonlySet<string>): boolean =>
  a.size === b.size && [...a].every((id) => b.has(id));

/**
 * The strip's thickness plus the tabset's border, which a collapsed panel
 * still shows. `vertical`: collapsed in a side-by-side split the strip runs
 * vertically, so its thickness is its width.
 */
const measureHeader = (panel: HTMLElement, vertical: boolean): number | undefined => {
  const tabset = partsIn(panel, PART.tabset).at(0);

  if (!tabset) {
    return undefined;
  }

  const strip = ownPart(tabset, PART.tabset, PART.tabstrip);

  if (vertical) {
    return (strip?.offsetWidth ?? 0) + tabset.offsetWidth - tabset.clientWidth;
  }

  return (strip?.offsetHeight ?? 0) + tabset.offsetHeight - tabset.clientHeight;
};

/**
 * A panel's `expand()` restores the size it had before it collapsed, and does
 * nothing when that size was already below the minimum.
 */
const expandToMinimum = (handle: PanelImperativeHandle, minimum: number | undefined): void => {
  if (handle.isCollapsed() && minimum !== undefined) {
    handle.resize(`${minimum}px`);
  }
};

type FitCandidate = { handle: PanelImperativeHandle; id: string; minimum: number; saving: number };

/** Pixels the children need and have; `saving` is what collapsing one candidate frees. */
type FitBudget = {
  available: number;
  candidates: Array<FitCandidate>;
  expandedCount: number;
  required: number;
};

type FitEntry = {
  /** Collapsible and expanded in the model, so it may collapse to fit. */
  eligible: boolean;
  handle: PanelImperativeHandle | undefined;
  header: number | undefined;
  id: string;
  minimum: number;
};

const addToBudget = (
  budget: FitBudget,
  { eligible, handle, header, id, minimum }: FitEntry,
): void => {
  const strip = handle?.isCollapsed() === true ? header : undefined;

  budget.required += strip ?? minimum;
  budget.expandedCount += strip === undefined ? 1 : 0;

  if (eligible && handle && header !== undefined) {
    budget.candidates.push({ handle, id, minimum, saving: minimum - header });
  }
};

const expandWhereRoom = (budget: FitBudget): void => {
  for (const { handle, minimum, saving } of budget.candidates) {
    if (handle.isCollapsed() && budget.required + saving <= budget.available) {
      expandToMinimum(handle, minimum);
      budget.required += saving;
      budget.expandedCount += 1;
    }
  }
};

const collapseUntilFit = (budget: FitBudget, targets: Set<string>): void => {
  for (const { handle, id, saving } of budget.candidates.toReversed()) {
    if (budget.required <= budget.available || budget.expandedCount <= 1) {
      return;
    }

    if (!handle.isCollapsed()) {
      targets.add(id);
      handle.collapse();
      budget.required -= saving;
      budget.expandedCount -= 1;
    }
  }
};

type SharedPanel = { fixed: number | undefined; weight: number };

/** Out of 100: a collapsed panel takes its `fixed` size, and the expanded ones share the rest by weight. */
const sharesOf = (panels: ReadonlyArray<SharedPanel>): Array<number> => {
  let fixedTotal = 0;
  let weightTotal = 0;

  for (const panel of panels) {
    if (panel.fixed === undefined) {
      weightTotal += panel.weight;
    } else {
      fixedTotal += panel.fixed;
    }
  }

  return panels.map((panel) => panel.fixed ?? ((100 - fixedTotal) * panel.weight) / weightTotal);
};

/** Read from the DOM, not from the panel group, whose sizes lag a container resize. */
const spaceForPanels = (group: HTMLElement, orientation: RowNode["orientation"]): number => {
  const sizeOf = (element: Element): number => {
    const rect = element.getBoundingClientRect();

    return orientation === "row" ? rect.width : rect.height;
  };

  let space = sizeOf(group);

  for (const splitter of childParts(group, PART.splitter)) {
    space -= sizeOf(splitter);
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

export {
  addToBudget,
  collapseUntilFit,
  expandToMinimum,
  expandWhereRoom,
  keepCollapsedWeights,
  measureHeader,
  sameSet,
  sharesOf,
  spaceForPanels,
};

export type { FitBudget };
