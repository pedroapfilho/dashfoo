import { Link, Outlet } from "@tanstack/react-router";
import {
  AppWindow,
  HardDriveDownload,
  History,
  LayoutDashboard,
  Move,
  PanelsLeftBottom,
  Smartphone,
} from "lucide-react";
import type { ReactNode } from "react";

const NAV = [
  { exact: true, icon: LayoutDashboard, label: "Overview", to: "/" },
  { exact: false, icon: Move, label: "Docking & drag", to: "/docking" },
  { exact: false, icon: AppWindow, label: "Tabset chrome", to: "/chrome" },
  { exact: false, icon: PanelsLeftBottom, label: "Panel sizing", to: "/sizing" },
  { exact: false, icon: HardDriveDownload, label: "Persistence", to: "/persistence" },
  { exact: false, icon: History, label: "Imperative control", to: "/controlled" },
  { exact: false, icon: Smartphone, label: "Responsive", to: "/responsive" },
] as const;

const linkClass =
  "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-xs text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 [&.active]:bg-neutral-100 [&.active]:font-medium [&.active]:text-neutral-950";

const RootLayout = (): ReactNode => (
  <div className="flex h-screen w-screen overflow-hidden bg-neutral-50 text-neutral-900">
    <nav className="flex w-52 shrink-0 flex-col gap-0.5 border-r border-neutral-200 bg-white p-3">
      <div className="px-2 py-3">
        <span className="text-sm font-semibold tracking-tight text-neutral-950">dashfoo</span>
        <p className="mt-0.5 text-[10px] text-neutral-400">headless docking layout</p>
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
