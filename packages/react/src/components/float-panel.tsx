"use client";

import type { Dashfoo, FloatNode, Geometry, GlobalAttributes, RowNode } from "@dashfoo/core";
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { useRef } from "react";

import { useLayout } from "../hooks/layout-store";
import type { ResizeEdges, Size } from "../lib/float-geometry";
import { clampToBounds, resizeRect } from "../lib/float-geometry";

import { LayoutRoot } from "./layout-root";
import { RowView } from "./row-view";
import { DockIcon, FloatIcon, GripIcon, MinimizeIcon } from "./tabset-icons";

// One floating panel: an absolutely-positioned overlay over the layout, dragged by
// its title bar and resized by edge/corner handles, with the panel itself rendered
// through a nested Layout.Root (drag-dock, float, and maximize switched off — a
// float is select/close/rename plus the title-bar "Dock back" control). Drag and
// resize update the DOM imperatively during the gesture and commit one `moveFloat`
// on release, so a drag is a single undo step and never re-renders per pointer move.

const firstTabsetTitle = (row: RowNode): string | undefined => {
  for (const child of row.children) {
    if (child.type === "tabset") {
      return (child.children[child.selected] ?? child.children[0])?.name;
    }
    const nested = firstTabsetTitle(child);
    if (nested) {
      return nested;
    }
  }
  return undefined;
};

// A readable window title: the float's own name, else the active tab of its first
// tabset (a float is usually one tabset), else a generic label.
const floatTitle = (node: FloatNode): string =>
  node.name ?? firstTabsetTitle(node.layout) ?? "Panel";

const titleBarStyle: CSSProperties = {
  alignItems: "center",
  display: "flex",
  flexShrink: 0,
  gap: "0.375rem",
  touchAction: "none",
};

const titleStyle: CSSProperties = {
  flex: 1,
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const dockButtonStyle: CSSProperties = {
  alignItems: "center",
  cursor: "pointer",
  display: "inline-flex",
  flexShrink: 0,
};

const bodyStyle: CSSProperties = { flex: 1, minHeight: 0, position: "relative" };

// data-edge encodes which edges the handle moves; style positions it on the frame.
const RESIZE_HANDLES: ReadonlyArray<{ edges: ResizeEdges; key: string; style: CSSProperties }> = [
  {
    edges: { x: 0, y: -1 },
    key: "n",
    style: { cursor: "ns-resize", height: 6, insetInline: 10, top: -3 },
  },
  {
    edges: { x: 0, y: 1 },
    key: "s",
    style: { bottom: -3, cursor: "ns-resize", height: 6, insetInline: 10 },
  },
  {
    edges: { x: 1, y: 0 },
    key: "e",
    style: { cursor: "ew-resize", insetBlock: 10, right: -3, width: 6 },
  },
  {
    edges: { x: -1, y: 0 },
    key: "w",
    style: { cursor: "ew-resize", insetBlock: 10, left: -3, width: 6 },
  },
  {
    edges: { x: 1, y: -1 },
    key: "ne",
    style: { cursor: "nesw-resize", height: 14, right: -4, top: -4, width: 14 },
  },
  {
    edges: { x: -1, y: -1 },
    key: "nw",
    style: { cursor: "nwse-resize", height: 14, left: -4, top: -4, width: 14 },
  },
  {
    edges: { x: 1, y: 1 },
    key: "se",
    style: { bottom: -4, cursor: "nwse-resize", height: 14, right: -4, width: 14 },
  },
  {
    edges: { x: -1, y: 1 },
    key: "sw",
    style: { bottom: -4, cursor: "nesw-resize", height: 14, left: -4, width: 14 },
  },
];

// Resolve a resize handle's data-edge back to its edges; a missing key (the title
// bar or the minimized chip) means a move, not a resize.
const EDGE_BY_KEY = new Map<string, ResizeEdges>(RESIZE_HANDLES.map((h) => [h.key, h.edges]));

// Approximate footprint of the minimized chip, used to keep it on screen while it
// is dragged (its window rect is preserved in geometry for restore).
const CHIP_SIZE: Size = { height: 34, width: 168 };
// Pointer travel (px) past which a press counts as a drag, not a tap.
const TAP_SLOP = 4;

type Gesture = {
  bounds: Size;
  edges: ResizeEdges | null; // null = move (no edges), else resize
  pointerId: number;
  start: Geometry;
  startX: number;
  startY: number;
};

type FloatPanelProps = {
  global: GlobalAttributes;
  node: FloatNode;
  onFocus: () => void;
  zIndex: number;
};

const FloatPanel = ({ global, node, onFocus, zIndex }: FloatPanelProps): ReactNode => {
  const dispatch = useLayout((state) => state.dispatch);
  const closableTabs = useLayout((state) => state.closableTabs);
  const editable = useLayout((state) => state.editable);
  const renamableTabs = useLayout((state) => state.renamableTabs);
  const resizableSplits = useLayout((state) => state.resizableSplits);
  const keepMounted = useLayout((state) => state.keepMounted);
  const renderTab = useLayout((state) => state.renderTab);
  const renderTabLabel = useLayout((state) => state.renderTabLabel);
  const renderTabsetToolbar = useLayout((state) => state.renderTabsetToolbar);
  const snap = useLayout((state) => state.snap);

  const panelRef = useRef<HTMLElement | null>(null);
  const gestureRef = useRef<Gesture | null>(null);
  const latestRef = useRef<Geometry>(node.geometry);
  const movedRef = useRef(false);
  const setPanel = (element: HTMLElement | null): void => {
    panelRef.current = element;
  };

  const restore = (): void =>
    dispatch({ floatId: node.id, minimized: false, type: "setFloatMinimized" });

  // One pointerdown handler for the title bar / chip (move) and the resize handles;
  // the moving edges ride the target's data-edge, so it can be assigned directly to
  // onPointerDown (no per-render closure that reads refs).
  const handlePointerDown = (event: ReactPointerEvent<HTMLElement>): void => {
    const panel = panelRef.current;
    if (!panel) {
      return;
    }
    onFocus();
    movedRef.current = false;
    const edgeKey = event.currentTarget.dataset.edge;
    // While minimized the chip keeps its small footprint on screen; otherwise the
    // whole window rect is clamped against the viewport (the overlay).
    const parent = panel.offsetParent as HTMLElement | null;
    gestureRef.current = {
      bounds: { height: parent?.clientHeight ?? 0, width: parent?.clientWidth ?? 0 },
      edges: edgeKey ? (EDGE_BY_KEY.get(edgeKey) ?? null) : null,
      pointerId: event.pointerId,
      start: node.geometry,
      startX: event.clientX,
      startY: event.clientY,
    };
    latestRef.current = node.geometry;
    panel.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  const handlePointerMove = (event: ReactPointerEvent): void => {
    const gesture = gestureRef.current;
    const panel = panelRef.current;
    if (!gesture || !panel || event.pointerId !== gesture.pointerId) {
      return;
    }
    const dx = event.clientX - gesture.startX;
    const dy = event.clientY - gesture.startY;
    if (Math.hypot(dx, dy) > TAP_SLOP) {
      movedRef.current = true;
    }
    const next = gesture.edges
      ? resizeRect(gesture.start, gesture.edges, dx, dy)
      : clampToBounds(
          { ...gesture.start, left: gesture.start.left + dx, top: gesture.start.top + dy },
          gesture.bounds,
          node.minimized ? CHIP_SIZE : undefined,
        );
    // next always carries the window's own width/height (the chip's footprint is
    // only used to clamp position), so restore reopens at the saved size.
    latestRef.current = next;
    panel.style.left = `${next.left}px`;
    panel.style.top = `${next.top}px`;
    // The chip's size is CSS-driven; only the window writes its own dimensions.
    if (!node.minimized) {
      panel.style.width = `${next.width}px`;
      panel.style.height = `${next.height}px`;
    }
  };

  const handlePointerUp = (event: ReactPointerEvent): void => {
    const gesture = gestureRef.current;
    if (!gesture || event.pointerId !== gesture.pointerId) {
      return;
    }
    gestureRef.current = null;
    panelRef.current?.releasePointerCapture(event.pointerId);
    // A tap on the minimized chip restores it; a drag repositions it.
    if (node.minimized && !movedRef.current) {
      restore();
      return;
    }
    dispatch({ floatId: node.id, geometry: latestRef.current, type: "moveFloat" });
  };

  if (node.minimized) {
    return (
      <button
        aria-label={`Restore ${floatTitle(node)} panel`}
        data-dashfoo="float-chip"
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            restore();
          }
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        ref={setPanel}
        style={{
          left: node.geometry.left,
          pointerEvents: "auto",
          position: "absolute",
          top: node.geometry.top,
          zIndex,
        }}
        title={floatTitle(node)}
        type="button"
      >
        <FloatIcon />
        <span data-dashfoo="float-chip-label">{floatTitle(node)}</span>
      </button>
    );
  }

  const floatModel: Dashfoo = { global, layout: node.layout, version: 1 };

  return (
    <div
      data-dashfoo="float"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      ref={setPanel}
      style={{
        height: node.geometry.height,
        left: node.geometry.left,
        // The overlay is pointer-events:none so it never blocks the docked layout;
        // each float opts back in.
        pointerEvents: "auto",
        position: "absolute",
        top: node.geometry.top,
        width: node.geometry.width,
        zIndex,
      }}
    >
      <div data-dashfoo="float-titlebar" onPointerDown={handlePointerDown} style={titleBarStyle}>
        <span aria-hidden="true" data-dashfoo="float-grip">
          <GripIcon />
        </span>
        <span data-dashfoo="float-title" style={titleStyle}>
          {floatTitle(node)}
        </span>
        <button
          aria-label="Minimize panel"
          data-dashfoo="float-minimize"
          onClick={() => dispatch({ floatId: node.id, minimized: true, type: "setFloatMinimized" })}
          onPointerDown={(event) => event.stopPropagation()}
          style={dockButtonStyle}
          type="button"
        >
          <MinimizeIcon />
        </button>
        <button
          aria-label="Dock panel back into the main layout"
          data-dashfoo="float-dock"
          onClick={() => dispatch({ floatId: node.id, type: "dockFloat" })}
          onPointerDown={(event) => event.stopPropagation()}
          style={dockButtonStyle}
          type="button"
        >
          <DockIcon />
        </button>
      </div>
      <div data-dashfoo="float-body" style={bodyStyle}>
        <LayoutRoot
          closableTabs={closableTabs}
          dispatch={dispatch}
          draggableTabs={false}
          draggableTabsets={false}
          editable={editable}
          floatable={false}
          keepMounted={keepMounted}
          maximizable={false}
          model={floatModel}
          renamableTabs={renamableTabs}
          renderTab={renderTab}
          renderTabLabel={renderTabLabel}
          renderTabsetToolbar={renderTabsetToolbar}
          resizableSplits={resizableSplits}
          snap={snap ?? undefined}
        >
          <RowView node={node.layout} />
        </LayoutRoot>
      </div>
      {RESIZE_HANDLES.map((handle) => (
        <div
          data-dashfoo="float-resize"
          data-edge={handle.key}
          key={handle.key}
          onPointerDown={handlePointerDown}
          style={{ position: "absolute", touchAction: "none", zIndex: 1, ...handle.style }}
        />
      ))}
    </div>
  );
};

export { FloatPanel };
export type { FloatPanelProps };
