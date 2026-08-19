import { Link, Outlet } from "@tanstack/react-router";
import {
  Blocks,
  BookOpen,
  History,
  Home,
  LayoutDashboard,
  Lock,
  Moon,
  Move,
  Sun,
} from "lucide-react";
import type { ReactNode } from "react";
import { useSyncExternalStore } from "react";

const NAV = [
  { exact: true, icon: LayoutDashboard, label: "Overview", to: "/" },
  { exact: false, icon: Move, label: "Docking & Widgets", to: "/docking" },
  {
    exact: false,
    icon: History,
    label: "Imperative control",
    to: "/controlled",
  },
  { exact: false, icon: Blocks, label: "Raw primitives", to: "/raw" },
  { exact: false, icon: Lock, label: "Static layout", to: "/static" },
] as const;

const EXTERNAL = [
  { href: "https://docs.dashfoo.com", icon: BookOpen, label: "Docs" },
  { href: "https://dashfoo.com", icon: Home, label: "dashfoo.com" },
] as const;

const THEME_KEY = "dashfoo:demo:theme";

const subscribeTheme = (handleStoreChange: () => void): (() => void) => {
  const observer = new MutationObserver(handleStoreChange);
  observer.observe(document.documentElement, {
    attributeFilter: ["data-dashfoo-theme"],
    attributes: true,
  });
  return () => {
    observer.disconnect();
  };
};

const getThemeSnapshot = (): boolean => document.documentElement.dataset.dashfooTheme === "dark";

const ThemeToggle = (): ReactNode => {
  const dark = useSyncExternalStore(subscribeTheme, getThemeSnapshot, () => false);

  const handleToggle = (): void => {
    const next = !dark;
    if (next) {
      document.documentElement.dataset.dashfooTheme = "dark";
    } else {
      delete document.documentElement.dataset.dashfooTheme;
    }

    document.querySelector("#theme-color")?.setAttribute("content", next ? "#0a0a0a" : "#ffffff");
    try {
      localStorage.setItem(THEME_KEY, next ? "dark" : "light");
    } catch {
      void 0;
    }
  };

  return (
    <button
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      className="shrink-0 rounded-md p-2 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
      onClick={handleToggle}
      type="button"
    >
      {dark ? <Sun size={15} strokeWidth={1.75} /> : <Moon size={15} strokeWidth={1.75} />}
    </button>
  );
};

const RootLayout = (): ReactNode => (
  <div className="flex h-dvh w-full flex-col overflow-hidden bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
    <header className="flex shrink-0 items-center gap-3 border-b border-neutral-200 bg-white px-3 py-1.5 sm:px-4 dark:border-neutral-800 dark:bg-neutral-900">
      <Link aria-label="Homepage" className="shrink-0 pr-1" to="/">
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
      </Link>
      <nav aria-label="Demos" className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
        {NAV.map((item) => (
          <Link
            activeOptions={{ exact: item.exact }}
            className="flex shrink-0 items-center gap-2 rounded-md px-2.5 py-2.5 text-xs text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 sm:py-2 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100 [&.active]:bg-neutral-100 [&.active]:text-neutral-950 dark:[&.active]:bg-neutral-800 dark:[&.active]:text-neutral-50"
            key={item.to}
            to={item.to}
          >
            <item.icon size={15} strokeWidth={1.75} />
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="flex shrink-0 items-center gap-1">
        {EXTERNAL.map((item) => (
          <a
            aria-label={item.label}
            className="flex shrink-0 items-center gap-2 rounded-md px-2.5 py-2.5 text-xs text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 sm:py-2 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
            href={item.href}
            key={item.href}
            rel="noopener noreferrer"
            target="_blank"
          >
            <item.icon size={15} strokeWidth={1.75} />
            <span className="hidden sm:inline">{item.label}</span>
          </a>
        ))}
      </div>
      <ThemeToggle />
    </header>
    <main className="min-h-0 flex-1 overflow-hidden">
      <Outlet />
    </main>
  </div>
);

export { RootLayout };
