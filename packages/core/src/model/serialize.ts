import { warn } from "../lib/warn";

import { normalize } from "./invariants";
import type { Dashfoo, RowNode, TabNode, TabsetNode } from "./schema";
import { dashfooSchema } from "./schema";
import { findDuplicateIds } from "./tree";

// oxlint-disable-next-line anti-slop/no-unknown-parameters -- parseModel is the public I/O boundary that runs dashfooSchema on untrusted input
const parseModel = (value: unknown): Dashfoo => {
  const model = normalize(dashfooSchema.parse(value));
  const duplicates = findDuplicateIds(model);

  if (duplicates.length > 0) {
    warn(`duplicate node ids in the loaded layout: ${duplicates.join(", ")}`);
  }

  return model;
};

/** Returns the app's current version of a saved tab, or `null` to drop it. */
type MapTab = (tab: TabNode) => TabNode | null;

type RestoreOptions = { mapTab?: MapTab };

/** Keeps the selected tab selected when tabs before it are dropped. */
const mapTabset = (tabset: TabsetNode, mapTab: MapTab): TabsetNode => {
  const selectedId = tabset.children[tabset.selected]?.id;

  const children = tabset.children.flatMap((tab) => {
    const mapped = mapTab(tab);

    return mapped === null ? [] : [mapped];
  });

  const selected = children.findIndex((tab) => tab.id === selectedId);

  return { ...tabset, children, selected: selected === -1 ? tabset.selected : selected };
};

const mapRow = (row: RowNode, mapTab: MapTab): RowNode => ({
  ...row,
  children: row.children.map((child) =>
    child.type === "tabset" ? mapTabset(child, mapTab) : mapRow(child, mapTab),
  ),
});

/**
 * The tolerant counterpart of `parseModel`, for saved layouts: corrupt data
 * warns and yields `null` instead of throwing, and `mapTab` upgrades or drops
 * tabs an older version of the app saved before the model is tidied.
 */
// oxlint-disable-next-line anti-slop/no-unknown-parameters -- restoreModel reads untrusted saved data
const restoreModel = (value: unknown, options: RestoreOptions = {}): Dashfoo | null => {
  const result = dashfooSchema.safeParse(value);

  if (!result.success) {
    warn("discarding a saved layout that is not a dashfoo model", result.error);

    return null;
  }

  const { mapTab } = options;
  const saved = result.data;

  try {
    const mapped = mapTab
      ? {
          ...saved,
          floats: saved.floats.map((float) => ({ ...float, layout: mapRow(float.layout, mapTab) })),
          layout: mapRow(saved.layout, mapTab),
        }
      : saved;

    return parseModel(mapped);
  } catch (error) {
    warn("discarding a saved layout that mapTab could not restore", error);

    return null;
  }
};

const toJSON = (model: Dashfoo): string => JSON.stringify(model);

const fromJSON = (json: string): Dashfoo => {
  const value: unknown = JSON.parse(json);

  return parseModel(value);
};

export { fromJSON, parseModel, restoreModel, toJSON };

export type { MapTab, RestoreOptions };
