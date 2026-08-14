import Link from "next/link";
import type { ReactNode } from "react";

import { GitHubIcon } from "./github-icon";
import { Logo } from "./logo";
import { MobileNav } from "./mobile-nav";
import { EXTERNAL_LINKS, GITHUB_URL, SECTION_LINKS } from "./nav-links";
import { ThemeToggle } from "./theme-toggle";

const LINK_CLASS =
  "rounded-dashfoo-sm px-3 py-2 font-mono font-medium text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

const Header = (): ReactNode => (
  <header className="border-border/70 bg-background/80 sticky top-0 z-10 border-b backdrop-blur">
    <div className="mx-auto flex max-w-6xl items-center gap-4 px-6 py-3 lg:px-8">
      <Link
        aria-label="Homepage"
        className="rounded-dashfoo-sm focus-visible:outline-ring shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2"
        href="/"
      >
        <Logo className="h-6 w-auto" />
      </Link>
      {/* Text-only links in the nav landmark; GitHub and the theme toggle are
          actions, so they sit outside it where icons are allowed. */}
      <nav aria-label="Primary" className="hidden items-center gap-1 text-sm lg:flex">
        {SECTION_LINKS.map((link) => (
          <a className={LINK_CLASS} href={link.href} key={link.href}>
            {link.label}
          </a>
        ))}
        {EXTERNAL_LINKS.map((link) => (
          <a
            className={LINK_CLASS}
            href={link.href}
            key={link.href}
            rel="noopener noreferrer"
            target="_blank"
          >
            {link.label}
          </a>
        ))}
      </nav>
      <div className="ml-auto flex items-center gap-1">
        <a
          aria-label="dashfoo on GitHub"
          className="rounded-dashfoo-sm text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-ring relative p-2 focus-visible:outline-2 focus-visible:outline-offset-2"
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
        <MobileNav />
      </div>
    </div>
  </header>
);

export { Header };
