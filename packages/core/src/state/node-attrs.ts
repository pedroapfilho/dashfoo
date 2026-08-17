import { z } from "zod";

import {
  dimensionSchema,
  orientationSchema,
  snapSchema,
  tabNodeSchema,
  tabsetNodeObjectSchema,
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

/** `weight` is re-declared, not picked: `.partial()` over a defaulted field still injects the default. */
const mutableTabsetAttrsSchema = tabsetNodeObjectSchema
  .pick({
    enableClose: true,
    enableMaximize: true,
    max: true,
    min: true,
    selected: true,
  })
  .extend({ weight: z.number() })
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
 * Merged, not a union: a union of all-optional members matches its first member
 * and strips the rest. The reducer enforces which keys a given node accepts.
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
