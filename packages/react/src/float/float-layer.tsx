"use client";

import type { FloatNode } from "@dashfoo/core";
import type { ReactNode } from "react";
import { useState } from "react";

import { FloatLayerContext } from "./float-context";
import { FloatPanel } from "./float-panel";

/** Rendered even while empty: a new float is placed in the overlay's own coordinates, which an ancestor transform can scale. */
const FloatOverlay = ({ floats }: { floats: Array<FloatNode> }): ReactNode => {
  const [topId, setTopId] = useState<string | null>(null);

  return (
    <div data-dashfoo="float-overlay">
      {floats.map((node) => (
        <FloatPanel
          key={node.id}
          node={node}
          onFocus={() => {
            setTopId(node.id);
          }}
          zIndex={node.id === topId ? 2 : 1}
        />
      ))}
    </div>
  );
};

type FloatLayerProps = {
  children: ReactNode;
  floats: Array<FloatNode>;
};

const FloatLayer = ({ children, floats }: FloatLayerProps): ReactNode => (
  <FloatLayerContext.Provider value>
    {children}
    <FloatOverlay floats={floats} />
  </FloatLayerContext.Provider>
);

export { FloatLayer };

export type { FloatLayerProps };
