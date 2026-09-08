"use client";

import type { TOCItemType } from "fumadocs-core/toc";
import type { ReactNode } from "react";

const MobileToc = ({ items }: { items: Array<TOCItemType> }): ReactNode => (
  <nav aria-label="On this page" className="mb-6 border-b pb-4 xl:hidden">
    <details>
      <summary className="min-h-11 cursor-pointer py-3 text-sm">On this page</summary>
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.url}>
            <a
              className="block py-2 text-sm underline underline-offset-4"
              href={item.url}
              onClick={(event) => {
                const details = event.currentTarget.closest("details");
                if (details) {
                  details.open = false;
                }
              }}
            >
              {item.title}
            </a>
          </li>
        ))}
      </ul>
    </details>
  </nav>
);

export { MobileToc };
