import { cacheLife } from "next/cache";

import { getLLMText } from "@/lib/get-llm-text";
import { source } from "@/lib/source";

const getLlmsFull = async () => {
  "use cache";
  cacheLife("max");
  const pages = source.getPages();
  const results = await Promise.allSettled(pages.map(getLLMText));
  const scanned = results.flatMap((result, index) => {
    if (result.status === "fulfilled") {
      return [result.value];
    }
    console.warn(`[dashfoo docs] llms-full.txt skipped ${pages[index]?.url}`, result.reason);
    return [];
  });

  if (pages.length > 0 && scanned.length === 0) {
    throw new Error("llms-full.txt: every page conversion failed");
  }

  return scanned.join("\n\n");
};

const GET = async () => new Response(await getLlmsFull());

export { GET };
