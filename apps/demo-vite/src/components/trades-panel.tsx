import { Panel } from "@dashfoo/react";
import { ArrowLeftRight } from "lucide-react";
import type { ReactNode } from "react";

import { useTrades } from "../data/feed";

import type { PanelProps } from "./panel-types";
import { Row } from "./row";

const TradesPanel = ({ node }: PanelProps): ReactNode => {
  const trades = useTrades();
  return (
    <Panel icon={<ArrowLeftRight size={14} />} live title={node.name}>
      <div className="flex flex-col gap-1.5">
        {trades.map((trade, index) => (
          <Row key={`${trade.price}-${index}`} label={trade.price} value={trade.size} />
        ))}
      </div>
    </Panel>
  );
};

export { TradesPanel };
