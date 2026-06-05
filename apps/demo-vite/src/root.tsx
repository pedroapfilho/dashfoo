import { Link, Outlet } from "@tanstack/react-router";
import {
  AppWindow,
  HardDriveDownload,
  History,
  LayoutDashboard,
  Move,
  Smartphone,
} from "lucide-react";
import type { ReactNode } from "react";

const NAV = [
  { exact: true, icon: LayoutDashboard, label: "Overview", to: "/" },
  { exact: false, icon: Move, label: "Docking & drag", to: "/docking" },
  { exact: false, icon: AppWindow, label: "Tabset chrome", to: "/chrome" },
  { exact: false, icon: HardDriveDownload, label: "Persistence", to: "/persistence" },
  { exact: false, icon: History, label: "Imperative control", to: "/controlled" },
  { exact: false, icon: Smartphone, label: "Responsive", to: "/responsive" },
] as const;

const linkClass =
  "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs text-df-muted transition-colors hover:bg-white/5 hover:text-df-text [&.active]:bg-white/10 [&.active]:font-medium [&.active]:text-df-emphasis";

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
          <item.icon size={15} strokeWidth={1.75} />
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
