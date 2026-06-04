import type { ReactNode } from "react";

import { useOrderBook } from "../data/feed";

import { PanelFrame } from "./panel-frame";
import type { PanelProps } from "./panel-types";

const DepthPanel = ({ node }: PanelProps): ReactNode => {
  const { asks, bids } = useOrderBook();
  return (
    <PanelFrame live title={node.name}>
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
    </PanelFrame>
  );
};

export { DepthPanel };
