import { z } from "zod";

import {
  dimensionSchema,
  orientationSchema,
  snapSchema,
  tabNodeSchema,
  tabsetNodeSchema,
} from "../model/schema";

const mutableTabAttrsSchema = tabNodeSchema
  .pick({
    config: true,
    enableClose: true,
    enableDrag: true,
    enableRename: true,
    name: true,
  })
  .partial();

const mutableTabsetAttrsSchema = tabsetNodeSchema
  .pick({
    enableClose: true,
    enableMaximize: true,
    max: true,
    min: true,
    selected: true,
    weight: true,
  })
  .partial();

const mutableRowAttrsSchema = z
  .object({
    max: dimensionSchema.optional(),
    min: dimensionSchema.optional(),
    orientation: orientationSchema,
    snap: snapSchema.optional(),
    weight: z.number(),
  })
  .partial();

/**
 * Every member here is fully optional, so this union always resolves on its
 * first member and strips the keys the other two own. Do not rely on it to
 * decide which attributes belong to a node: `reducer` re-parses the payload
 * with the target node's own schema before writing it.
 */
const mutableNodeAttrsSchema = z.union([
  mutableTabAttrsSchema,
  mutableTabsetAttrsSchema,
  mutableRowAttrsSchema,
]);

export {
  mutableNodeAttrsSchema,
  mutableRowAttrsSchema,
  mutableTabAttrsSchema,
  mutableTabsetAttrsSchema,
};
