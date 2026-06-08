import { getLLMText } from "@/lib/get-llm-text";
import { source } from "@/lib/source";

// Statically cached forever — no server runtime needed.
export const revalidate = false;

/**
 * Concatenates every page's processed Markdown into a single document an AI can
 * read in one fetch.
 */
export const GET = async () => {
  const scanned = await Promise.all(source.getPages().map(getLLMText));

  return new Response(scanned.join("\n\n"));
};
