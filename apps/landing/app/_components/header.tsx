import Link from "next/link";
import type { ReactNode } from "react";

import { GitHubIcon } from "./github-icon";
import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";

const GITHUB_URL = "https://github.com/pedroapfilho/dashfoo";
const DOCS_URL = "https://docs.dashfoo.com";
const DEMO_URL = "https://demo.dashfoo.com";

const Header = (): ReactNode => (
  <header className="border-dashfoo-border/70 bg-dashfoo-background/80 sticky top-0 z-10 border-b backdrop-blur">
    <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-3 lg:px-8">
      <Link
        aria-label="Homepage"
        className="rounded-dashfoo-sm focus-visible:ring-dashfoo-ring shrink-0 focus-visible:ring-2 focus-visible:outline-none"
        href="/"
      >
        <Logo className="h-6 w-auto" />
      </Link>
      <nav aria-label="Primary" className="ml-auto flex items-center gap-1 text-sm">
        <a
          className="text-dashfoo-muted-foreground hover:bg-dashfoo-muted hover:text-dashfoo-foreground rounded-dashfoo-sm hidden px-3 py-2 font-medium transition-colors sm:block"
          href={DOCS_URL}
        >
          Docs
        </a>
        <a
          className="text-dashfoo-muted-foreground hover:bg-dashfoo-muted hover:text-dashfoo-foreground rounded-dashfoo-sm hidden px-3 py-2 font-medium transition-colors sm:block"
          href={DEMO_URL}
        >
          Demo
        </a>
        <a
          aria-label="dashfoo on GitHub"
          className="text-dashfoo-muted-foreground hover:bg-dashfoo-muted hover:text-dashfoo-foreground rounded-dashfoo-sm relative p-2 transition-colors"
          href={GITHUB_URL}
          rel="noopener noreferrer"
          target="_blank"
        >
          <GitHubIcon className="size-5 h-lh" />
          <span
            aria-hidden="true"
            className="absolute top-1/2 left-1/2 size-[max(100%,3rem)] -translate-1/2 pointer-fine:hidden"
          />
        </a>
        <ThemeToggle />
      </nav>
    </div>
  </header>
);

export { Header };
