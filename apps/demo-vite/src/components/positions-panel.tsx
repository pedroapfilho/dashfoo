import { Wallet } from "lucide-react";
import type { ReactNode } from "react";

import { usePositions } from "../data/feed";

import { PanelFrame } from "./panel-frame";
import type { PanelProps } from "./panel-types";
import { Row } from "./row";
import { SignedValue } from "./signed-value";

const PositionsPanel = ({ node }: PanelProps): ReactNode => {
  const positions = usePositions();
  return (
    <PanelFrame icon={<Wallet size={14} />} live title={node.name}>
      <div className="flex flex-col gap-1.5">
        {positions.map((position) => (
          <Row
            key={position.symbol}
            label={position.symbol}
            value={<SignedValue display={position.display} value={position.pnl} />}
          />
        ))}
      </div>
    </PanelFrame>
  );
};

export { PositionsPanel };
