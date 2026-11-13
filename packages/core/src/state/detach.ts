import type { Dashfoo, SelectOnRemove, TabNode, TabsetNode } from "../model/schema";
import type { TabsetSlot } from "../model/tree";
import { findTab, findTabsetParent } from "../model/tree";

/**
 * The index of the tab that inherits the selection when the selected tab at
 * `removedIndex` leaves: under `"recent"` the last other tab selected, else
 * (or with no history) its right neighbour, else its left. `-1` when none is left.
 */
const fallbackSelectedIndex = (
  strip: TabsetNode,
  removedIndex: number,
  policy: SelectOnRemove = "neighbor",
): number => {
  const indexById = new Map(strip.children.map((tab, index) => [tab.id, index]));
  indexById.delete(strip.children[removedIndex]?.id ?? "");

  const recent =
    policy === "recent" ? strip.selectionHistory?.find((id) => indexById.has(id)) : undefined;

  if (recent !== undefined) {
    return indexById.get(recent) ?? -1;
  }

  return removedIndex + 1 < strip.children.length ? removedIndex + 1 : removedIndex - 1;
};

const detachTab = (draft: Dashfoo, container: TabsetNode, index: number): TabNode | undefined => {
  const heir =
    index === container.selected
      ? fallbackSelectedIndex(container, index, draft.global.tabSetSelectOnRemove)
      : container.selected;

  const removed = container.children.splice(index, 1).at(0);
  container.selected = heir > index ? heir - 1 : heir;

  return removed;
};

const removeTab = (draft: Dashfoo, tabId: string): TabNode | undefined => {
  const location = findTab(draft, tabId);

  return location && detachTab(draft, location.container, location.index);
};

const detachTabset = ({ parent, tabset: detached }: TabsetSlot): TabsetNode => {
  parent.children.splice(parent.children.indexOf(detached), 1);

  return detached;
};

const removeTabset = (draft: Dashfoo, tabsetId: string): void => {
  const slot = findTabsetParent(draft, tabsetId);

  if (slot) {
    detachTabset(slot);
  }
};

const removeNode = (draft: Dashfoo, nodeId: string): void => {
  if (findTab(draft, nodeId)) {
    removeTab(draft, nodeId);
  } else {
    removeTabset(draft, nodeId);
  }
};

export { detachTab, detachTabset, fallbackSelectedIndex, removeNode, removeTab, removeTabset };
