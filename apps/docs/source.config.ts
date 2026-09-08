import { defineConfig, defineDocs } from "fumadocs-mdx/config";

export const docs = defineDocs({
  dir: "content/docs",

  docs: { postprocess: { includeProcessedMarkdown: true } },
});

export default defineConfig({
  mdxOptions: {
    rehypeCodeOptions: {
      themes: { dark: "github-dark-high-contrast", light: "github-light-high-contrast" },
    },
    remarkNpmOptions: {
      persist: { id: "package-manager" },
    },
  },
});
