import { Link, Outlet } from "@tanstack/react-router";
import {
  Blocks,
  BookOpen,
  History,
  Home,
  LayoutDashboard,
  Lock,
  Menu,
  Moon,
  Move,
  Sun,
} from "lucide-react";
import type { ReactNode } from "react";
import { useSyncExternalStore, useState } from "react";

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
      className="text-foreground-muted hover:bg-surface-muted hover:text-foreground-primary dark:text-foreground-disabled dark:hover:bg-surface-raised-inverse dark:hover:text-foreground-inverse shrink-0 rounded-md p-2 transition-colors"
      onClick={handleToggle}
      type="button"
    >
      {dark ? <Sun size={15} strokeWidth={1.75} /> : <Moon size={15} strokeWidth={1.75} />}
    </button>
  );
};

const RootLayout = (): ReactNode => {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="bg-surface-subtle text-foreground-primary dark:bg-surface-deep dark:text-foreground-inverse flex h-dvh w-full flex-col overflow-hidden">
      <header className="border-border-default dark:border-border-inverse-faint dark:bg-surface-inverse flex shrink-0 items-center gap-3 border-b bg-white px-3 py-1.5 sm:px-4">
        <Link aria-label="Homepage" className="shrink-0 pr-1" to="/">
          <img
            alt="dashfoo"
            className="block h-5 w-auto dark:hidden"
            height={20}
            src="/dashfoo-logo-light.svg"
            width={105}
          />
          <img
            alt="dashfoo"
            className="hidden h-5 w-auto dark:block"
            height={20}
            src="/dashfoo-logo-dark.svg"
            width={105}
          />
        </Link>
        <nav
          aria-label="Demos"
          className="hidden min-w-0 flex-1 items-center gap-1 overflow-x-auto md:flex"
        >
          {NAV.map((item) => (
            <Link
              activeOptions={{ exact: item.exact }}
              className="text-foreground-muted hover:bg-surface-muted hover:text-foreground-primary dark:text-foreground-disabled dark:hover:bg-surface-raised-inverse dark:hover:text-foreground-inverse [&.active]:bg-surface-muted [&.active]:text-foreground-deep dark:[&.active]:bg-surface-raised-inverse dark:[&.active]:text-foreground-bright flex shrink-0 items-center gap-2 rounded-md px-2.5 py-2.5 text-xs transition-colors sm:py-2"
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
              className="text-foreground-muted hover:bg-surface-muted hover:text-foreground-primary dark:text-foreground-disabled dark:hover:bg-surface-raised-inverse dark:hover:text-foreground-inverse flex shrink-0 items-center gap-2 rounded-md px-2.5 py-2.5 text-xs transition-colors sm:py-2"
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
        <button
          aria-controls="demo-mobile-nav"
          aria-expanded={menuOpen}
          aria-label="Demo navigation"
          className="min-h-11 min-w-11 rounded-md p-2 md:hidden"
          onClick={() => {
            setMenuOpen(!menuOpen);
          }}
          type="button"
        >
          <Menu size={20} />
        </button>
      </header>
      {menuOpen ? (
        <nav
          aria-label="Demo pages"
          className="border-border-default dark:border-border-inverse-subtle flex shrink-0 flex-wrap gap-2 border-b p-3 md:hidden"
          id="demo-mobile-nav"
        >
          {NAV.map((item) => (
            <Link
              className="hover:bg-surface-hover dark:hover:bg-surface-raised-inverse min-h-11 rounded-md px-3 py-3 text-sm"
              key={item.to}
              onClick={() => {
                setMenuOpen(false);
              }}
              to={item.to}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      ) : null}
      <main className="min-h-0 flex-1 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
};

export { RootLayout };
