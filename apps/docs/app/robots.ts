import type { MetadataRoute } from "next";

const robots = (): MetadataRoute.Robots => ({
  rules: { allow: "/", userAgent: "*" },
  sitemap: "https://docs.dashfoo.com/sitemap.xml",
});

export default robots;
