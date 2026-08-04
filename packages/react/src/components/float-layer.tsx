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

const FloatOverlay = ({ floats }: { floats: Array<FloatNode> }): ReactNode => {
  const [topId, setTopId] = useState<string | null>(null);
  if (floats.length === 0) {
    return null;
  }
  return (
    <div data-dashfoo="float-overlay" style={overlayStyle}>
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
  /**
   * Accepted for backwards compatibility only. Floating panels now inherit
   * every global-derived capability from the layout store above them, so this
   * is no longer read; it disappears in the next major.
   */
  global?: GlobalAttributes;
};

const FloatLayer = ({ children, floats }: FloatLayerProps): ReactNode => (
  <FloatLayerContext.Provider value>
    {children}
    <FloatOverlay floats={floats} />
  </FloatLayerContext.Provider>
);

export { FloatLayer };
export type { FloatLayerProps };
