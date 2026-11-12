import { model, row, tabset } from "./builders";
import type { Dashfoo } from "./schema";
import { findTab, findTabset } from "./tree";

/**
 * A model holding only `nodeId` (a tab gets a tabset of its own), with the
 * source's `global` attributes, so a torn-off node renders the same elsewhere.
 */
const standaloneModel = (source: Dashfoo, nodeId: string): Dashfoo | undefined => {
  const tab = findTab(source, nodeId)?.tab;
  const node = tab ? tabset([tab]) : findTabset(source, nodeId);

  return node && structuredClone(model(row([{ ...node, weight: 1 }]), { global: source.global }));
};

export { standaloneModel };
