import { z } from "zod";

import { rowNodeSchema, tabNodeSchema, tabsetNodeSchema } from "../model/schema";

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
const mutableTabsetAttrsSchema = tabsetNodeSchema
  .pick({
    collapsible: true,
    enableClose: true,
    enableMaximize: true,
    max: true,
    min: true,
    selected: true,
  })
  .extend({ weight: z.number() })
  .partial();

const mutableRowAttrsSchema = rowNodeSchema
  .pick({
    max: true,
    min: true,
    orientation: true,
    snap: true,
  })
  .extend({ weight: z.number() })
  .partial();

/**
 * Merged, not a union: a union of all-optional members matches its first member
 * and strips the rest. The reducer enforces which keys a given node accepts.
 */
const mutableNodeAttrsSchema = mutableTabAttrsSchema
  .extend(mutableTabsetAttrsSchema.shape)
  .extend(mutableRowAttrsSchema.shape);

type MutableNodeAttrs = z.infer<typeof mutableNodeAttrsSchema>;

export {
  mutableNodeAttrsSchema,
  mutableRowAttrsSchema,
  mutableTabAttrsSchema,
  mutableTabsetAttrsSchema,
};

export type { MutableNodeAttrs };
