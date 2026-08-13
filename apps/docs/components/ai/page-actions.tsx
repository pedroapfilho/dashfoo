"use client";
import { usePathname } from "fumadocs-core/framework";
import { Check, ChevronDown, Copy, ExternalLinkIcon, TextIcon } from "lucide-react";
import { type ComponentProps, useEffect, useMemo, useRef, useState, useTransition } from "react";

import { cn } from "../../lib/cn";
import { buttonVariants } from "../ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";

import { AnthropicIcon, CursorIcon, GitHubIcon, OpenAiIcon, SciraIcon } from "./provider-icons";

const AI_PROVIDERS = [
  {
    buildHref: (q: string) => `https://scira.ai/?${new URLSearchParams({ q })}`,
    icon: <SciraIcon />,
    title: "Open in Scira AI",
  },
  {
    buildHref: (q: string) => `https://chatgpt.com/?${new URLSearchParams({ hints: "search", q })}`,
    icon: <OpenAiIcon />,
    title: "Open in ChatGPT",
  },
  {
    buildHref: (q: string) => `https://claude.ai/new?${new URLSearchParams({ q })}`,
    icon: <AnthropicIcon />,
    title: "Open in Claude",
  },
  {
    buildHref: (q: string) => `https://cursor.com/link/prompt?${new URLSearchParams({ text: q })}`,
    icon: <CursorIcon />,
    title: "Open in Cursor",
  },
];

const markdownCache = new Map<string, Promise<string>>();
type CopyStatus = "copied" | "failed" | "idle";

const MarkdownCopyButton = ({
  markdownUrl,
  ...props
}: ComponentProps<"button"> & { markdownUrl: string }) => {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<CopyStatus>("idle");
  const timeoutRef = useRef<number | undefined>(undefined);

  useEffect(
    () => () => {
      window.clearTimeout(timeoutRef.current);
    },
    [],
  );

  const showStatus = (next: Exclude<CopyStatus, "idle">): void => {
    setStatus(next);
    window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      setStatus("idle");
    }, 1500);
  };

  const handleClick = (): void => {
    startTransition(async () => {
      const cached = markdownCache.get(markdownUrl);
      const markdown =
        cached ??
        (async () => {
          const response = await fetch(markdownUrl);
          if (!response.ok) {
            throw new Error(`fetching ${markdownUrl} failed with ${response.status}`);
          }
          return response.text();
        })();
      markdownCache.set(markdownUrl, markdown);
      try {
        await navigator.clipboard.write([new ClipboardItem({ "text/plain": markdown })]);
        showStatus("copied");
      } catch (error) {
        try {
          await markdown;
        } catch {
          markdownCache.delete(markdownUrl);
        }
        showStatus("failed");
        console.warn(`[dashfoo docs] copying ${markdownUrl} failed`, error);
      }
    });
  };

  return (
    <button
      disabled={isPending}
      onClick={handleClick}
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
      {status === "copied" ? <Check /> : <Copy />}
      <span aria-live="polite">
        {status === "failed" ? "Copy failed. Try again" : (props.children ?? "Copy Markdown")}
      </span>
    </button>
  );
};

const ViewOptionsPopover = ({
  githubUrl,
  markdownUrl,
  ...props
}: ComponentProps<"button"> & { githubUrl?: string; markdownUrl?: string }) => {
  const pathname = usePathname();
  const items = useMemo(() => {
    const q = `Read ${new URL(pathname, "https://dashfoo.com")}, I want to ask questions about it.`;
    return [
      ...(githubUrl !== undefined && githubUrl !== ""
        ? [{ href: githubUrl, icon: <GitHubIcon />, title: "Open in GitHub" }]
        : []),
      ...(markdownUrl !== undefined && markdownUrl !== ""
        ? [{ href: markdownUrl, icon: <TextIcon />, title: "View as Markdown" }]
        : []),
      ...AI_PROVIDERS.map(({ buildHref, icon, title }) => ({ href: buildHref(q), icon, title })),
    ];
  }, [githubUrl, markdownUrl, pathname]);

  return (
    <Popover>
      <PopoverTrigger
        {...props}
        className={cn(
          buttonVariants({ className: "gap-2", color: "secondary", size: "sm" }),
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
};

export { MarkdownCopyButton, ViewOptionsPopover };
