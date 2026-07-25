"use client";

import type { FloatNode, GlobalAttributes } from "@dashfoo/core";
import type { CSSProperties, ReactNode } from "react";
import { useState } from "react";

import { FloatLayerContext } from "./float-context";
import { FloatPanel } from "./float-panel";

const overlayStyle: CSSProperties = {
  inset: 0,

  pointerEvents: "none",
  position: "fixed",

  zIndex: 1,
};

const FloatOverlay = ({
  floats,
  global,
}: {
  floats: Array<FloatNode>;
  global: GlobalAttributes;
}): ReactNode => {
  const [topId, setTopId] = useState<string | null>(null);
  if (floats.length === 0) {
    return null;
  }
  return (
    <div data-dashfoo="float-overlay" style={overlayStyle}>
      {floats.map((node) => (
        <FloatPanel
          global={global}
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
  global: GlobalAttributes;
};

const FloatLayer = ({ children, floats, global }: FloatLayerProps): ReactNode => (
  <FloatLayerContext.Provider value>
    {children}
    <FloatOverlay floats={floats} global={global} />
  </FloatLayerContext.Provider>
);

export { FloatLayer };
export type { FloatLayerProps };
