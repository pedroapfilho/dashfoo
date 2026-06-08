import type { source } from "@/lib/source";

/**
 * Renders a single docs page as plain Markdown for LLMs: a title heading
 * (with the canonical URL) followed by the post-remark processed Markdown,
 * with MDX components flattened to text.
 */
const getLLMText = async (page: (typeof source)["$inferPage"]) => {
  const processed = await page.data.getText("processed");

  return `# ${page.data.title} (${page.url})

${processed}`;
};

export { getLLMText };
