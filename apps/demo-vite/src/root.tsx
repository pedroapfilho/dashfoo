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
import { useState } from "react";

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

// Cross-links to the other dashfoo surfaces. Kept out of the scrolling demo
// <nav> so they stay pinned beside the theme toggle at any width.
const EXTERNAL = [
  { href: "https://docs.dashfoo.com", icon: BookOpen, label: "Docs" },
  { href: "https://dashfoo.com", icon: Home, label: "dashfoo.com" },
] as const;

const THEME_KEY = "dashfoo:demo:theme";

// Flips data-dashfoo-theme on <html> — the dashfoo theme and the shell's
// Tailwind dark: variant both key off it. The pre-paint script in index.html
// applied the initial value, so state is read back from the DOM.
const ThemeToggle = (): ReactNode => {
  const [dark, setDark] = useState(() => document.documentElement.dataset.dashfooTheme === "dark");

  const handleToggle = (): void => {
    const next = !dark;
    setDark(next);
    if (next) {
      document.documentElement.dataset.dashfooTheme = "dark";
    } else {
      delete document.documentElement.dataset.dashfooTheme;
    }
    try {
      localStorage.setItem(THEME_KEY, next ? "dark" : "light");
    } catch {
      // storage unavailable — the choice just won't survive a reload
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

// A top bar instead of a fixed sidebar so the shell holds up at any width: the
// nav scrolls horizontally when it doesn't fit, and the stage keeps the full
// viewport width on small screens.
const RootLayout = (): ReactNode => (
  <div className="flex h-dvh w-full flex-col overflow-hidden bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
    <header className="flex shrink-0 items-center gap-3 border-b border-neutral-200 bg-white px-4 py-1.5 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="shrink-0 pr-1">
        <span className="text-sm font-semibold tracking-tight text-neutral-950 dark:text-neutral-50">
          dashfoo
        </span>
      </div>
      <nav aria-label="Demos" className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
        {NAV.map((item) => (
          <Link
            activeOptions={{ exact: item.exact }}
            className="flex shrink-0 items-center gap-2 rounded-md px-2.5 py-2 text-xs text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100 [&.active]:bg-neutral-100 [&.active]:text-neutral-950 dark:[&.active]:bg-neutral-800 dark:[&.active]:text-neutral-50"
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
            className="flex shrink-0 items-center gap-2 rounded-md px-2.5 py-2 text-xs text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
            href={item.href}
            key={item.href}
            rel="noopener noreferrer"
            target="_blank"
          >
            <item.icon size={15} strokeWidth={1.75} />
            {item.label}
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
