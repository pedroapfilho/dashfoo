import { normalize } from "./invariants";
import type { Dashfoo } from "./schema";
import { dashfooSchema } from "./schema";
import { findDuplicateIds } from "./tree";

const CURRENT_VERSION = 1;

// Upgrade an older persisted payload to the current schema version. With only v1
// today this just backfills a missing version; future versions add a step per
// bump here, keeping fromJSON/parseModel forward-compatible.
const migrate = (value: unknown): unknown => {
  if (typeof value !== "object" || value === null) {
    return value;
  }
  if ("version" in value && typeof value.version === "number" && value.version >= CURRENT_VERSION) {
    return value;
  }
  return { ...value, version: CURRENT_VERSION };
};

// Validate an untrusted value against the schema (after migration) and return a
// normalized, canonical model. Throws if the value is not a valid model; warns
// (does not throw) on duplicate ids, which corrupt React keys and the plumbing.
const parseModel = (value: unknown): Dashfoo => {
  const model = normalize(dashfooSchema.parse(migrate(value)));
  const duplicates = findDuplicateIds(model);
  if (duplicates.length > 0) {
    // oxlint-disable-next-line no-console
    console.warn(`[dashfoo] duplicate node ids in the loaded layout: ${duplicates.join(", ")}`);
  }
  return model;
};

const toJSON = (model: Dashfoo): string => JSON.stringify(model);

const fromJSON = (json: string): Dashfoo => parseModel(JSON.parse(json));

export { CURRENT_VERSION, fromJSON, migrate, parseModel, toJSON };
