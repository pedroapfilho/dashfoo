import { Panel } from "@dashfoo/react";
import {
  CircleCheck,
  Coins,
  Files,
  FolderTree,
  ListTree,
  ReceiptText,
  SquareTerminal,
  StickyNote,
  Terminal,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";

import type { PanelProps } from "./panel-types";

const TEXT_CONTENT: Record<string, Array<string>> = {
  balances: ["BTC   1.284", "ETH   18.40", "USDC  42,910"],
  console: ["› build finished in 1.2s", "› 0 errors · 0 warnings", "› watching for changes…"],
  explorer: ["src/", "  router.tsx", "  pages/", "package.json", "vite.config.ts"],
  files: ["README.md", "index.html", "src/main.tsx", "src/index.css"],
  notes: ["Drag a tab onto another panel to stack it.", "Drag to an edge to split or dock."],
  orders: ["Limit buy   0.50", "Stop sell   0.25"],
  outline: ["# Overview", "## Layout model", "## Docking", "## Persistence"],
  problems: ["No problems detected."],
  terminal: ["$ pnpm dev", "VITE ready in 240 ms", "➜ local: http://localhost:5174/"],
};

const COMPONENT_ICON: Record<string, LucideIcon> = {
  balances: Coins,
  console: Terminal,
  explorer: FolderTree,
  files: Files,
  notes: StickyNote,
  orders: ReceiptText,
  outline: ListTree,
  problems: CircleCheck,
  terminal: SquareTerminal,
};

const GenericPanel = ({ node }: PanelProps): ReactNode => {
  const lines = TEXT_CONTENT[node.component] ?? [`${node.name} panel`];
  const Icon = COMPONENT_ICON[node.component];
  return (
    <Panel icon={Icon ? <Icon size={14} /> : undefined} title={node.name}>
      <div className="text-df-muted flex flex-col gap-1 font-mono text-[11px] leading-relaxed">
        {lines.map((line) => (
          <div key={line}>{line}</div>
        ))}
      </div>
    </Panel>
  );
};

export { GenericPanel };
