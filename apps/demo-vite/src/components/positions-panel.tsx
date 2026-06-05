import { Panel } from "@dashfoo/react";
import { Wallet } from "lucide-react";
import type { ReactNode } from "react";

import { usePositions } from "../data/feed";

import type { PanelProps } from "./panel-types";
import { Row } from "./row";
import { SignedValue } from "./signed-value";

const PositionsPanel = ({ node }: PanelProps): ReactNode => {
  const positions = usePositions();
  return (
    <Panel icon={<Wallet size={14} />} live title={node.name}>
      <div className="flex flex-col gap-1.5">
        {positions.map((position) => (
          <Row
            key={position.symbol}
            label={position.symbol}
            value={<SignedValue display={position.display} value={position.pnl} />}
          />
        ))}
      </div>
    </Panel>
  );
};

export { PositionsPanel };
