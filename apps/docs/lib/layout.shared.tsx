import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";

const GITHUB_URL = "https://github.com/pedroapfilho/dashfoo";

/**
 * Layout options shared between the docs layout and any home layout.
 * The nav title renders the dashfoo brand mark. The site theme is toggled
 * via next-themes' `.dark` class, not `prefers-color-scheme`, so the
 * light/dark variant must swap on the Tailwind `dark:` variant — a
 * <picture> media query would follow the OS and show the wrong mark
 * whenever the toggle disagrees with the OS.
 */
export const baseOptions = (): BaseLayoutProps => ({
  githubUrl: GITHUB_URL,
  links: [
    {
      external: true,
      text: "Home",
      type: "button",
      url: "https://dashfoo.com",
    },
    {
      external: true,
      text: "Demo",
      type: "button",
      url: "https://demo.dashfoo.com",
    },
  ],
  nav: {
    title: (
      <>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt="dashfoo"
          className="block h-5 w-auto dark:hidden"
          height={20}
          src="/dashfoo-logo-light.svg"
          width={105}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt="dashfoo"
          className="hidden h-5 w-auto dark:block"
          height={20}
          src="/dashfoo-logo-dark.svg"
          width={105}
        />
      </>
    ),
    transparentMode: "top",
  },
});
