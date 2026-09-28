import { llms } from "fumadocs-core/source";
import { cacheLife } from "next/cache";

import { source } from "@/lib/source";

const getLlmsIndex = async () => {
  "use cache";
  cacheLife("max");
  return llms(source).index();
};

const GET = async () => new Response(await getLlmsIndex());

export { GET };
