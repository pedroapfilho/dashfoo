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
 * One all-optional object carrying every mutable key of every node kind, not a
 * union of the three: a union whose members are all fully optional matches on
 * its first member and strips the keys the others own, which erased every
 * tabset and row attribute at the parse boundary. The four keys that two kinds
 * share (`enableClose`, `max`, `min`, `weight`) declare the same type on both
 * sides, so merging widens nothing. Which keys are legal for a given node is
 * enforced by the reducer against that node's own schema.
 */
const mutableNodeAttrsSchema = mutableTabAttrsSchema
  .extend(mutableTabsetAttrsSchema.shape)
  .extend(mutableRowAttrsSchema.shape);

export {
  mutableNodeAttrsSchema,
  mutableRowAttrsSchema,
  mutableTabAttrsSchema,
  mutableTabsetAttrsSchema,
};
