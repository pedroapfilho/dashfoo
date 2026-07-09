import { normalize } from "./invariants";
import type { Dashfoo } from "./schema";
import { dashfooSchema } from "./schema";
import { findDuplicateIds } from "./tree";

const parseModel = (value: unknown): Dashfoo => {
  const model = normalize(dashfooSchema.parse(value));
  const duplicates = findDuplicateIds(model);
  if (duplicates.length > 0) {
    // oxlint-disable-next-line no-console
    console.warn(`[dashfoo] duplicate node ids in the loaded layout: ${duplicates.join(", ")}`);
  }
  return model;
};

const toJSON = (model: Dashfoo): string => JSON.stringify(model);

const fromJSON = (json: string): Dashfoo => parseModel(JSON.parse(json));

export { fromJSON, parseModel, toJSON };
