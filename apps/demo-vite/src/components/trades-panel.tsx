import type { ReactNode } from "react";

import { useTrades } from "../data/feed";

import { PanelFrame } from "./panel-frame";
import type { PanelProps } from "./panel-types";
import { Row } from "./row";

const TradesPanel = ({ node }: PanelProps): ReactNode => {
  const trades = useTrades();
  return (
    <PanelFrame live title={node.name}>
      <div className="flex flex-col gap-1.5">
        {trades.map((trade, index) => (
          <Row key={`${trade.price}-${index}`} label={trade.price} value={trade.size} />
        ))}
      </div>
    </PanelFrame>
  );
};

export { TradesPanel };
