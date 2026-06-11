import { Link, Outlet } from "@tanstack/react-router";
import { History, LayoutDashboard, Move } from "lucide-react";
import type { ReactNode } from "react";

const NAV = [
  { exact: true, icon: LayoutDashboard, label: "Overview", to: "/" },
  { exact: false, icon: Move, label: "Docking & widgets", to: "/docking" },
  {
    exact: false,
    icon: History,
    label: "Imperative control",
    to: "/controlled",
  },
] as const;

const linkClass =
  "flex shrink-0 items-center gap-2 rounded-md px-2.5 py-2 text-xs text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 [&.active]:bg-neutral-100 [&.active]:font-medium [&.active]:text-neutral-950";

// A top bar instead of a fixed sidebar so the shell holds up at any width: the
// nav scrolls horizontally when it doesn't fit, and the stage keeps the full
// viewport width on small screens.
const RootLayout = (): ReactNode => (
  <div className="flex h-dvh w-full flex-col overflow-hidden bg-neutral-50 text-neutral-900">
    <header className="flex shrink-0 items-center gap-3 border-b border-neutral-200 bg-white px-4 py-1.5">
      <div className="shrink-0 pr-1">
        <span className="text-sm font-semibold tracking-tight text-neutral-950">dashfoo</span>
      </div>
      <nav aria-label="Demos" className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
        {NAV.map((item) => (
          <Link
            activeOptions={{ exact: item.exact }}
            className={linkClass}
            key={item.to}
            to={item.to}
          >
            <item.icon size={15} strokeWidth={1.75} />
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
    <main className="min-h-0 flex-1 overflow-hidden">
      <Outlet />
    </main>
  </div>
);

export { RootLayout };
