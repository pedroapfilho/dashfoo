import { createFromSource } from "fumadocs-core/search/server";
import { cacheLife } from "next/cache";

import { source } from "@/lib/source";

const search = createFromSource(source);

const getSearchIndex = async () => {
  "use cache";
  cacheLife("max");
  const index = await search.export();
  return index;
};

const GET = async () => Response.json(await getSearchIndex());

export { GET };
