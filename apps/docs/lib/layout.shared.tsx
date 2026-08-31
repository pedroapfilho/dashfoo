import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import Image from "next/image";

const GITHUB_URL = "https://github.com/pedroapfilho/dashfoo";
const WEB_URL = process.env.NEXT_PUBLIC_WEB_URL ?? "https://dashfoo.com";
const DEMO_URL = process.env.NEXT_PUBLIC_DEMO_URL ?? "https://demo.dashfoo.com";

export const baseOptions = (): BaseLayoutProps => ({
  githubUrl: GITHUB_URL,
  links: [
    {
      external: true,
      text: "Home",
      type: "button",
      url: WEB_URL,
    },
    {
      external: true,
      text: "Demo",
      type: "button",
      url: DEMO_URL,
    },
  ],
  nav: {
    title: (
      <>
        <Image
          alt="dashfoo"
          className="block h-5 w-auto dark:hidden"
          height={20}
          src="/dashfoo-logo-light.svg"
          unoptimized
          width={105}
        />
        <Image
          alt="dashfoo"
          className="hidden h-5 w-auto dark:block"
          height={20}
          src="/dashfoo-logo-dark.svg"
          unoptimized
          width={105}
        />
      </>
    ),
    transparentMode: "top",
  },
});
