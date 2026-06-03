import { Link, Outlet } from "@tanstack/react-router";
import type { ReactNode } from "react";

const NAV = [
  { exact: true, label: "Overview", to: "/" },
  { exact: false, label: "Docking & drag", to: "/docking" },
  { exact: false, label: "Tabset chrome", to: "/chrome" },
  { exact: false, label: "Borders & edges", to: "/borders" },
  { exact: false, label: "Persistence", to: "/persistence" },
  { exact: false, label: "Controlled & history", to: "/controlled" },
] as const;

const linkClass =
  "rounded-md px-2.5 py-1.5 text-xs text-df-muted transition-colors hover:bg-white/5 hover:text-df-text [&.active]:bg-white/10 [&.active]:font-medium [&.active]:text-df-emphasis";

const RootLayout = (): ReactNode => (
  <div className="bg-df-bg text-df-text flex h-screen w-screen overflow-hidden">
    <nav className="border-df-border bg-df-strip flex w-52 shrink-0 flex-col gap-0.5 border-r p-3">
      <div className="px-2 py-3">
        <span className="text-df-emphasis text-sm font-semibold tracking-tight">dashfoo</span>
        <p className="text-df-faint mt-0.5 text-[10px]">headless docking layout</p>
      </div>
      {NAV.map((item) => (
        <Link
          activeOptions={{ exact: item.exact }}
          className={linkClass}
          key={item.to}
          to={item.to}
        >
          {item.label}
        </Link>
      ))}
    </nav>
    <main className="min-w-0 flex-1 overflow-hidden">
      <Outlet />
    </main>
  </div>
);

export { RootLayout };
