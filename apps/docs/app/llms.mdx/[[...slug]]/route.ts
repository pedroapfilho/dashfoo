import { notFound } from "next/navigation";

import { getLLMText } from "@/lib/get-llm-text";
import { source } from "@/lib/source";

// Statically pre-rendered for every docs page.
export const revalidate = false;

/**
 * Serves a single docs page as Markdown for AI agents. Reached either by
 * appending `.mdx` to a docs URL or via the Accept-header proxy.
 */
export const GET = async (
  _req: Request,
  { params }: { params: Promise<{ slug?: Array<string> }> },
) => {
  const { slug } = await params;
  const page = source.getPage(slug);
  if (!page) {
    notFound();
  }

  return new Response(await getLLMText(page), {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
};

export const generateStaticParams = () => source.generateParams();
