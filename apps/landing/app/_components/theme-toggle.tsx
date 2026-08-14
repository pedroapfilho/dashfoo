"use client";

import { Moon, Sun } from "lucide-react";
import type { ReactNode } from "react";
import { useSyncExternalStore } from "react";

const THEME_KEY = "dashfoo:landing:theme";
const THEME_EVENT = "dashfoo:theme-change";

const subscribe = (callback: () => void): (() => void) => {
  window.addEventListener(THEME_EVENT, callback);
  return () => {
    window.removeEventListener(THEME_EVENT, callback);
  };
};
const getSnapshot = (): boolean => document.documentElement.dataset.dashfooTheme === "dark";
const getServerSnapshot = (): boolean => false;

const ThemeToggle = (): ReactNode => {
  const dark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const handleToggle = (): void => {
    const next = !dark;
    if (next) {
      document.documentElement.dataset.dashfooTheme = "dark";
    } else {
      delete document.documentElement.dataset.dashfooTheme;
    }
    try {
      localStorage.setItem(THEME_KEY, next ? "dark" : "light");
    } catch {
      void 0;
    }
    window.dispatchEvent(new Event(THEME_EVENT));
  };

  return (
    <button
      aria-label="Dark theme"
      aria-pressed={dark}
      className="rounded-dashfoo-sm text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-ring relative shrink-0 p-2 focus-visible:outline-2 focus-visible:outline-offset-2"
      onClick={handleToggle}
      type="button"
    >
      {dark ? (
        <Sun className="size-5 shrink-0" strokeWidth={1.75} />
      ) : (
        <Moon className="size-5 shrink-0" strokeWidth={1.75} />
      )}
      <span
        aria-hidden="true"
        className="absolute top-1/2 left-1/2 size-[max(100%,3rem)] -translate-1/2 pointer-fine:hidden"
      />
    </button>
  );
};

export { ThemeToggle };
