import type { MetadataRoute } from "next";

import { source } from "@/lib/source";

const sitemap = (): MetadataRoute.Sitemap =>
  source.getPages().map((page) => ({ url: `https://docs.dashfoo.com${page.url}` }));

export default sitemap;
