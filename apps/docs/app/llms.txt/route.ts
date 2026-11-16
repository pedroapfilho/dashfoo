import { llms } from "fumadocs-core/source";
import { cacheLife } from "next/cache";

import { source } from "@/lib/source";

const getLlmsIndex = async () => {
  "use cache";
  cacheLife("max");
  const index = await Promise.resolve(llms(source).index());

  return index;
};

const GET = async () => new Response(await getLlmsIndex());

export { GET };
