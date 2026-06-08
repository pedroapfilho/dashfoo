import { llms } from "fumadocs-core/source";

import { source } from "@/lib/source";

// Statically cached forever — no server runtime needed.
export const revalidate = false;

/**
 * Exposes the docs as an llms.txt index so language models can discover every
 * page, title, and summary in one fetch.
 */
export const GET = () => new Response(llms(source).index());
