import type { source } from "@/lib/source";

const getLLMText = async (page: (typeof source)["$inferPage"]) => {
  const processed = await page.data.getText("processed");

  return `# ${page.data.title} (${page.url})

${processed}`;
};

export { getLLMText };
