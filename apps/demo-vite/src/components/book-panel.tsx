import type { ReactNode } from "react";

import { useOrderBook } from "../data/feed";

import { PanelFrame } from "./panel-frame";
import type { PanelProps } from "./panel-types";
import { Row } from "./row";

const BookPanel = ({ node }: PanelProps): ReactNode => {
  const { asks, bids } = useOrderBook();
  return (
    <PanelFrame live title={node.name}>
      <div className="flex flex-col gap-1.5">
        {asks.map((row) => (
          <Row key={row.price} label={row.price} value={row.size} />
        ))}
        <div className="border-df-border my-1 border-t" />
        {bids.map((row) => (
          <Row key={row.price} label={row.price} value={row.size} />
        ))}
      </div>
    </PanelFrame>
  );
};

export { BookPanel };
