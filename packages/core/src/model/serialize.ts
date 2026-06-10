import { normalize } from "./invariants";
import type { Dashfoo } from "./schema";
import { dashfooSchema } from "./schema";
import { findDuplicateIds } from "./tree";

// Validate an untrusted value against the schema and return a normalized,
// canonical model. Throws if the value is not a valid model — including a
// payload whose `version` is not the pinned `1`; warns (does not throw) on
// duplicate ids, which corrupt React keys and the plumbing.
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
