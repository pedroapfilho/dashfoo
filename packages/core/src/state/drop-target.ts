import { tabset } from "../model/builders";
import type { Dashfoo } from "../model/schema";
import type { TabsetSlot } from "../model/tree";
import { findTabsetParent } from "../model/tree";

/**
 * An empty main layout has no tabset to drop into, so its row id stands in and
 * seeds an empty one. A drop that then fails leaves it empty, and `normalize`
 * removes it again.
 */
const locateDropTarget = (draft: Dashfoo, targetId: string): TabsetSlot | undefined => {
  const slot = findTabsetParent(draft, targetId);

  if (slot || targetId !== draft.layout.id || draft.layout.children.length > 0) {
    return slot;
  }

  const seeded = tabset([]);
  draft.layout.children.push(seeded);

  return { index: 0, parent: draft.layout, tabset: seeded };
};

export { locateDropTarget };
