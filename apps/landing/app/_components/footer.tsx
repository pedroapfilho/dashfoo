import Link from "next/link";
import type { ReactNode } from "react";

import { Logo } from "./logo";

const COLUMNS: Array<{
  heading: string;
  links: Array<{ external?: boolean; href: string; label: string }>;
}> = [
  {
    heading: "Product",
    links: [
      { external: true, href: "https://docs.dashfoo.com", label: "Documentation" },
      { external: true, href: "https://demo.dashfoo.com", label: "Live demo" },
      { external: true, href: "https://github.com/pedroapfilho/dashfoo", label: "GitHub" },
    ],
  },
  {
    heading: "Packages",
    links: [
      {
        external: true,
        href: "https://www.npmjs.com/package/@dashfoo/core",
        label: "@dashfoo/core",
      },
      {
        external: true,
        href: "https://www.npmjs.com/package/@dashfoo/react",
        label: "@dashfoo/react",
      },
      {
        external: true,
        href: "https://www.npmjs.com/package/@dashfoo/theme",
        label: "@dashfoo/theme",
      },
    ],
  },
];

const Footer = (): ReactNode => (
  <footer className="border-dashfoo-border/70 border-t">
    <div className="mx-auto grid max-w-6xl grid-cols-1 gap-x-8 gap-y-10 px-6 py-12 sm:grid-cols-3 lg:px-8">
      <div className="sm:col-span-1">
        <Link
          aria-label="Homepage"
          className="rounded-dashfoo-sm focus-visible:outline-dashfoo-ring inline-block focus-visible:outline-2 focus-visible:outline-offset-2"
          href="/"
        >
          <Logo className="h-6 w-auto" />
        </Link>
        <p className="text-dashfoo-muted-foreground mt-4 max-w-[36ch] text-base text-pretty sm:text-sm">
          Headless React docking layout. Tiled, resizable, tabbed regions that you style yourself.
        </p>
      </div>
      {COLUMNS.map((column) => (
        <div key={column.heading}>
          <h3 className="text-dashfoo-foreground text-base font-medium sm:text-sm">
            {column.heading}
          </h3>
          <ul className="mt-4 flex flex-col gap-3">
            {column.links.map((link) => (
              <li className="text-base sm:text-sm" key={link.label}>
                <a
                  className="text-dashfoo-muted-foreground hover:text-dashfoo-foreground rounded-dashfoo-sm focus-visible:outline-dashfoo-ring font-normal focus-visible:outline-2 focus-visible:outline-offset-2"
                  href={link.href}
                  rel={link.external === true ? "noopener noreferrer" : undefined}
                  target={link.external === true ? "_blank" : undefined}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
    <div className="border-dashfoo-border/70 border-t">
      <div className="text-dashfoo-muted-foreground mx-auto flex max-w-6xl flex-col gap-2 px-6 py-6 text-base sm:flex-row sm:items-center sm:justify-between sm:text-sm lg:px-8">
        <p>© 2026 dashfoo. MIT-licensed.</p>
        <p>Built with dashfoo.</p>
      </div>
    </div>
  </footer>
);

export { Footer };
