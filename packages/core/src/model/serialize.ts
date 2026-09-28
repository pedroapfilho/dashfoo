import { normalize } from "./invariants";
import type { Dashfoo } from "./schema";
import { dashfooSchema, jsonValueSchema } from "./schema";
import { findDuplicateIds } from "./tree";

// oxlint-disable-next-line anti-slop/no-unknown-parameters -- parseModel is the public I/O boundary that runs dashfooSchema on untrusted input
const parseModel = (value: unknown): Dashfoo => {
  const model = normalize(dashfooSchema.parse(value));
  const duplicates = findDuplicateIds(model);
  if (duplicates.length > 0) {
    // oxlint-disable-next-line no-console -- dashfoo reports degraded paths on the developer console instead of failing silently
    console.warn(`[dashfoo] duplicate node ids in the loaded layout: ${duplicates.join(", ")}`);
  }
  return model;
};

const toJSON = (model: Dashfoo): string => JSON.stringify(model);

const fromJSON = (json: string): Dashfoo => parseModel(jsonValueSchema.parse(JSON.parse(json)));

export { fromJSON, parseModel, toJSON };
