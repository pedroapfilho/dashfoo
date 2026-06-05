import { Panel } from "@dashfoo/react";
import { Layers } from "lucide-react";
import type { ReactNode } from "react";

import { useOrderBook } from "../data/feed";

import type { PanelProps } from "./panel-types";

const DepthPanel = ({ node }: PanelProps): ReactNode => {
  const { asks, bids } = useOrderBook();
  return (
    <Panel icon={<Layers size={14} />} live title={node.name}>
      <div className="flex flex-col gap-1">
        {[...asks, ...bids].map((row, index) => (
          <div className="flex items-center gap-2" key={row.price}>
            <div
              className="h-3 rounded-xs bg-white/10"
              style={{ width: `${30 + (index % 3) * 22}%` }}
            />
            <span className="text-df-muted text-[11px] tabular-nums">{row.price}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
};

export { DepthPanel };
