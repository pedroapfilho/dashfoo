import { normalize } from "./invariants";
import type { Dashfoo, Json } from "./schema";
import { dashfooSchema, jsonValueSchema } from "./schema";
import { findDuplicateIds } from "./tree";

const parseModel = (value: Json): Dashfoo => {
  const model = normalize(dashfooSchema.parse(value));
  const duplicates = findDuplicateIds(model);
  if (duplicates.length > 0) {
    // oxlint-disable-next-line no-console
    console.warn(`[dashfoo] duplicate node ids in the loaded layout: ${duplicates.join(", ")}`);
  }
  return model;
};

const toJSON = (model: Dashfoo): string => JSON.stringify(model);

const fromJSON = (json: string): Dashfoo => parseModel(jsonValueSchema.parse(JSON.parse(json)));

export { fromJSON, parseModel, toJSON };
