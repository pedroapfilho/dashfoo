import { defineConfig, defineDocs } from "fumadocs-mdx/config";

export const docs = defineDocs({
  dir: "content/docs",
  // Stash the post-remark Markdown so `page.data.getText("processed")`
  // can feed the llms-full.txt / *.mdx AI endpoints.
  docs: { postprocess: { includeProcessedMarkdown: true } },
});

export default defineConfig({
  mdxOptions: {
    // `remarkNpm` is on by default; persist the reader's package-manager
    // choice across every code block site-wide.
    remarkNpmOptions: {
      persist: { id: "package-manager" },
    },
  },
});
