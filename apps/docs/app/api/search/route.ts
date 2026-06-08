import { createFromSource } from "fumadocs-core/search/server";

import { source } from "@/lib/source";

// Statically cached Orama index — no server runtime needed.
export const revalidate = false;

export const { staticGET: GET } = createFromSource(source);
