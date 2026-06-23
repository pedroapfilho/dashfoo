"use client";

import type { FloatNode, GlobalAttributes } from "@dashfoo/core";
import type { CSSProperties, ReactNode } from "react";
import { useState } from "react";

import { FloatLayerContext } from "./float-context";
import { FloatPanel } from "./float-panel";

// The floating-panel layer: the in-app counterpart of the drag layer. It renders
// `model.floats` as draggable, resizable overlays over the docked layout, in the
// SAME React tree — so context, events, and styling just work (no separate window,
// no portal). Wrap the layout's content with <Layout.FloatLayer> and it drops an
// absolutely-positioned overlay alongside the rows.

const overlayStyle: CSSProperties = {
  inset: 0,
  // Never block the docked layout underneath; each float opts pointer events back
  // in, so empty overlay space stays click-through.
  pointerEvents: "none",
  position: "absolute",
};

const FloatOverlay = ({
  floats,
  global,
}: {
  floats: Array<FloatNode>;
  global: GlobalAttributes;
}): ReactNode => {
  // The clicked float comes to the front; the rest share the lower band, stacking
  // by DOM (model) order.
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
          onFocus={() => setTopId(node.id)}
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
