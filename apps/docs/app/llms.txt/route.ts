import { llms } from "fumadocs-core/source";
import { cacheLife } from "next/cache";

import { source } from "@/lib/source";

// oxlint-disable-next-line require-await -- Next.js requires functions using "use cache" to be async.
const getLlmsIndex = async () => {
  "use cache";
  cacheLife("max");
  return llms(source).index();
};

const GET = async () => new Response(await getLlmsIndex());

export { GET };
