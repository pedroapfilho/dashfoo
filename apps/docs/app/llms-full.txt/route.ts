import { getLLMText } from "@/lib/get-llm-text";
import { source } from "@/lib/source";

// Statically cached forever — no server runtime needed.
export const revalidate = false;

/**
 * Concatenates every page's processed Markdown into a single document an AI can
 * read in one fetch.
 */
export const GET = async () => {
  // allSettled: page conversions are independent, so one broken page degrades
  // the document instead of 500ing the whole route.
  const pages = source.getPages();
  const results = await Promise.allSettled(pages.map(getLLMText));
  const scanned = results.flatMap((result, index) => {
    if (result.status === "fulfilled") {
      return [result.value];
    }
    console.warn(`[dashfoo docs] llms-full.txt skipped ${pages[index]?.url}`, result.reason);
    return [];
  });

  return new Response(scanned.join("\n\n"));
};
