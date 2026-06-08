import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";

const GITHUB_URL = "https://github.com/pedroapfilho/dashfoo";

/**
 * Layout options shared between the docs layout and any home layout.
 * The nav title renders the dashfoo brand mark, swapping the light/dark
 * SVG variant with the active theme via a single <picture> element.
 * This saves an HTTP request compared to a two-<Image> approach.
 */
export const baseOptions = (): BaseLayoutProps => ({
  githubUrl: GITHUB_URL,
  nav: {
    title: (
      <picture>
        <source media="(prefers-color-scheme: dark)" srcSet="/dashfoo-logo-dark.svg" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt="dashfoo"
          className="h-5 w-auto"
          height={20}
          src="/dashfoo-logo-light.svg"
          width={105}
        />
      </picture>
    ),
    transparentMode: "top",
  },
});
