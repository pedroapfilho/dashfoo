"use client";
import { usePathname } from "fumadocs-core/framework";
import { useCopyButton } from "fumadocs-ui/utils/use-copy-button";
import { Check, ChevronDown, Copy, ExternalLinkIcon, TextIcon } from "lucide-react";
import { type ComponentProps, useMemo, useTransition } from "react";

import { cn } from "../../lib/cn";
import { buttonVariants } from "../ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

const cache = new Map<string, Promise<string>>();

/**
 * see https://fumadocs.dev/docs/integrations/llms#page-actions to customize.
 */
export function MarkdownCopyButton({
  markdownUrl,
  ...props
}: ComponentProps<"button"> & {
  /**
   * A URL to fetch the raw Markdown/MDX content of page
   */
  markdownUrl: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [checked, onClick] = useCopyButton(() => {
    startTransition(async () => {
      const cached = cache.get(markdownUrl);
      if (cached) {
        await navigator.clipboard.writeText(await cached);
        return;
      }

      const promise = (async () => {
        const res = await fetch(markdownUrl);
        return res.text();
      })();
      cache.set(markdownUrl, promise);
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/plain": promise,
        }),
      ]);
    });
  });

  return (
    <button
      disabled={isPending}
      onClick={onClick}
      type="button"
      {...props}
      className={cn(
        buttonVariants({
          className: "gap-2 [&_svg]:size-3.5 [&_svg]:text-fd-muted-foreground",
          color: "secondary",
          size: "sm",
        }),
        props.className,
      )}
    >
      {checked ? <Check /> : <Copy />}
      {props.children ?? "Copy Markdown"}
    </button>
  );
}

/**
 * see https://fumadocs.dev/docs/integrations/llms#page-actions to customize.
 */
export function ViewOptionsPopover({
  githubUrl,
  markdownUrl,
  ...props
}: ComponentProps<"button"> & {
  /**
   * Source file URL on GitHub
   */
  githubUrl?: string;

  /**
   * A URL to the raw Markdown/MDX content of page
   */
  markdownUrl?: string;
}) {
  const pathname = usePathname();
  const items = useMemo(() => {
    const pageUrl =
      typeof window === "undefined" ? pathname : new URL(pathname, window.location.origin);
    const q = `Read ${pageUrl}, I want to ask questions about it.`;

    return [
      githubUrl && {
        href: githubUrl,
        icon: (
          <svg fill="currentColor" viewBox="0 0 24 24">
            <title>GitHub</title>
            <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
          </svg>
        ),
        title: "Open in GitHub",
      },
      markdownUrl && {
        href: markdownUrl,
        icon: <TextIcon />,
        title: "View as Markdown",
      },
      {
        href: `https://scira.ai/?${new URLSearchParams({
          q,
        })}`,
        icon: (
          <svg
            fill="none"
            height="934"
            viewBox="0 0 910 934"
            width="910"
            xmlns="http://www.w3.org/2000/svg"
          >
            <title>Scira AI</title>
            <path
              d="M647.7 197.8C569.1 189 525.5 145.4 516.8 66.9C508 145.4 464.4 189 385.9 197.8C464.4 206.5 508 250.1 516.8 328.7C525.5 250.1 569.1 206.5 647.7 197.8Z"
              fill="currentColor"
              stroke="currentColor"
              strokeLinejoin="round"
              strokeWidth="8"
            />
            <path
              d="M516.8 304.2C510.3 275.5 498.2 252.1 480.3 234.2C462.5 216.3 439.1 204.3 410.3 197.8C439.1 191.3 462.5 179.2 480.3 161.3C498.2 143.5 510.3 120.1 516.8 91.3C523.3 120.1 535.3 143.5 553.2 161.3C571.1 179.2 594.5 191.3 623.2 197.8C594.5 204.3 571.1 216.3 553.2 234.2C535.3 252.1 523.3 275.5 516.8 304.2Z"
              fill="currentColor"
              stroke="currentColor"
              strokeLinejoin="round"
              strokeWidth="8"
            />
            <path
              d="M857.5 508.1C763.3 497.6 710.9 445.3 700.4 351.1C690 445.3 637.6 497.6 543.4 508.1C637.6 518.6 690 570.9 700.4 665.2C710.9 570.9 763.3 518.6 857.5 508.1Z"
              stroke="currentColor"
              strokeLinejoin="round"
              strokeWidth="20"
            />
            <path
              d="M700.4 616C691.8 589.1 678.6 566.4 660.4 548.2C642.2 530 619.5 516.7 592.6 508.1C619.5 499.5 642.2 486.3 660.4 468.1C678.6 449.9 691.8 427.2 700.4 400.3C709 427.2 722.3 449.9 740.5 468.1C758.7 486.3 781.4 499.5 808.3 508.1C781.4 516.7 758.7 530 740.5 548.2C722.3 566.4 709 589.1 700.4 616Z"
              stroke="currentColor"
              strokeLinejoin="round"
              strokeWidth="20"
            />
            <path
              d="M889.9 121.2C831 114.7 798.3 82 791.8 23.1C785.2 82 752.5 114.7 693.6 121.2C752.5 127.8 785.2 160.5 791.8 219.4C798.3 160.5 831 127.8 889.9 121.2Z"
              fill="currentColor"
              stroke="currentColor"
              strokeLinejoin="round"
              strokeWidth="8"
            />
            <path
              d="M791.8 196.8C786.7 176.9 777.9 160.6 765.2 147.9C752.5 135.2 736.1 126.3 716.2 121.2C736.1 116.2 752.5 107.3 765.2 94.6C777.9 81.9 786.7 65.5 791.8 45.7C796.9 65.5 805.7 81.9 818.4 94.6C831.1 107.3 847.5 116.2 867.3 121.2C847.5 126.3 831.1 135.2 818.4 147.9C805.7 160.6 796.9 176.9 791.8 196.8Z"
              fill="currentColor"
              stroke="currentColor"
              strokeLinejoin="round"
              strokeWidth="8"
            />
            <path
              d="M760.6 764.3C720.7 814.6 669.8 855.1 611.9 882.7C553.9 910.3 490.4 924.3 426.2 923.5C362 922.8 298.8 907.4 241.5 878.5C184.2 849.6 134.2 808 95.5 756.9C56.7 705.7 30.1 646.3 17.8 583.3C5.5 520.3 7.8 455.4 24.4 393.4C41.1 331.4 71.7 274 113.9 225.7C156.2 177.3 208.9 139.3 268.1 114.4"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="30"
            />
          </svg>
        ),
        title: "Open in Scira AI",
      },
      {
        href: `https://chatgpt.com/?${new URLSearchParams({
          hints: "search",
          q,
        })}`,
        icon: (
          <svg fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <title>OpenAI</title>
            <path d="M22.3 9.8a6 6 0 0 0-.52-4.9 6 6 0 0 0-6.5-2.9A6.1 6.1 0 0 0 5 4.2a6 6 0 0 0-4 2.9 6 6 0 0 0 .74 7.1 6 6 0 0 0 .51 4.9 6.1 6.1 0 0 0 6.5 2.9A6 6 0 0 0 13.3 24a6.1 6.1 0 0 0 5.77-4.2 6 6 0 0 0 4-2.9 6.1 6.1 0 0 0-.75-7.1zm-9 12.6a4.5 4.5 0 0 1-2.88-1.04l.14-.08 4.78-2.76a.79.79 0 0 0 .39-.68v-6.74l2.02 1.17a.07.07 0 0 1 .04.05v5.58a4.5 4.5 0 0 1-4.49 4.49zm-9.66-4.13a4.47 4.47 0 0 1-.53-3.01l.14.09 4.78 2.76a.77.77 0 0 0 .78 0l5.84-3.37v2.33a.08.08 0 0 1-.03.06L9.74 19.95a4.5 4.5 0 0 1-6.14-1.65zM2.34 7.9a4.49 4.49 0 0 1 2.37-1.97V11.6a.77.77 0 0 0 .39.68l5.81 3.35-2.02 1.17a.08.08 0 0 1-.07 0L4.03 14.1A4.5 4.5 0 0 1 2.34 7.87zm16.6 3.86L13.1 8.36 15.12 7.2a.08.08 0 0 1 .07 0l4.83 2.79a4.49 4.49 0 0 1-.68 8.1v-5.68a.79.79 0 0 0-.41-.67zm2.01-3.02l-.14-.09-4.77-2.78a.78.78 0 0 0-.79 0L9.41 9.23V6.9a.07.07 0 0 1 .03-.06l4.83-2.79a4.5 4.5 0 0 1 6.68 4.66zM8.31 12.86l-2.02-1.16a.08.08 0 0 1-.04-.06V6.07a4.5 4.5 0 0 1 7.38-3.45l-.14.08L8.7 5.46a.79.79 0 0 0-.39.68zm1.1-2.37l2.6-1.5 2.61 1.5v3l-2.6 1.5-2.61-1.5Z" />
          </svg>
        ),
        title: "Open in ChatGPT",
      },
      {
        href: `https://claude.ai/new?${new URLSearchParams({
          q,
        })}`,
        icon: (
          <svg fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <title>Anthropic</title>
            <path d="M17.3 3.54h-3.67l6.7 16.92H24Zm-10.61 0L0 20.46h3.74l1.37-3.55h7.01l1.37 3.55h3.74L10.54 3.54Zm-.37 10.22 2.29-5.95 2.29 5.95Z" />
          </svg>
        ),
        title: "Open in Claude",
      },
      {
        href: `https://cursor.com/link/prompt?${new URLSearchParams({
          text: q,
        })}`,
        icon: (
          <svg fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <title>Cursor</title>
            <path d="M11.503.131 1.891 5.678a.84.84 0 0 0-.42.726v11.188c0 .3.162.575.42.724l9.609 5.55a1 1 0 0 0 .998 0l9.61-5.55a.84.84 0 0 0 .42-.724V6.404a.84.84 0 0 0-.42-.726L12.497.131a1.01 1.01 0 0 0-.996 0M2.657 6.338h18.55c.263 0 .43.287.297.515L12.23 22.918c-.062.107-.229.064-.229-.06V12.335a.59.59 0 0 0-.295-.51l-9.11-5.257c-.109-.063-.064-.23.061-.23" />
          </svg>
        ),
        title: "Open in Cursor",
      },
    ].filter((v) => !!v);
  }, [githubUrl, markdownUrl, pathname]);

  return (
    <Popover>
      <PopoverTrigger
        {...props}
        className={cn(
          buttonVariants({
            color: "secondary",
            size: "sm",
          }),
          "gap-2",
          props.className,
        )}
      >
        {props.children ?? "Open"}
        <ChevronDown className="text-fd-muted-foreground size-3.5" />
      </PopoverTrigger>
      <PopoverContent className="flex flex-col">
        {items.map((item) => (
          <a
            className="hover:text-fd-accent-foreground hover:bg-fd-accent inline-flex items-center gap-2 rounded-lg p-2 text-sm [&_svg]:size-4"
            href={item.href}
            key={item.href}
            rel="noreferrer noopener"
            target="_blank"
          >
            {item.icon}
            {item.title}
            <ExternalLinkIcon className="text-fd-muted-foreground ms-auto size-3.5" />
          </a>
        ))}
      </PopoverContent>
    </Popover>
  );
}
