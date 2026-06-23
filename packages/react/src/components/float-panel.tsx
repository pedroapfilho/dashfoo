"use client";

import type { Action, Dashfoo, FloatNode, Geometry, GlobalAttributes } from "@dashfoo/core";
import type {
  CSSProperties,
  FocusEvent as ReactFocusEvent,
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from "react";
import { useEffect, useRef, useState } from "react";

import { useLayout } from "../hooks/layout-store";
import type { ResizeEdges, Size } from "../lib/float-geometry";
import { clampToBounds, resizeRect } from "../lib/float-geometry";

import { DragProvider } from "./drag-adapter";
import { EDGE_BY_KEY, RESIZE_HANDLES } from "./float-resize-handles";
import { LayoutRoot } from "./layout-root";
import { RowView } from "./row-view";
import { DockIcon, FloatIcon, GripIcon, MinimizeIcon, ResizeGripIcon } from "./tabset-icons";

// One floating panel: an absolutely-positioned overlay over the layout, dragged by
// its title bar and resized by edge/corner handles, with the panel itself rendered
// through a nested Layout.Root (drag-dock, float, and maximize switched off — a
// float is select/close/rename plus the title-bar "Dock back" control). Drag and
// resize update the DOM imperatively during the gesture and commit one `moveFloat`
// on release, so a drag is a single undo step and never re-renders per pointer move.

// The window title is the float's own name ("Panel", "Panel 1", …), set when it is
// floated and editable via the title bar — never the active tab's name.
const floatTitle = (node: FloatNode): string => node.name ?? "Panel";

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

// Decorative cue marking a bottom corner as a resize grip. pointerEvents:none so
// it never steals the gesture from the handle beneath it; the grip glyph sits a
// couple of px inside the frame, dimmed so it reads as a hint, not chrome.
const resizeGripStyle: CSSProperties = {
  bottom: 2,
  opacity: 0.4,
  pointerEvents: "none",
  position: "absolute",
  zIndex: 1,
};

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

type TitleProps = { dispatch: (action: Action) => void; node: FloatNode };

// Inline title editor — mirrors the tab-rename pattern: focus + select on mount,
// a `done` ref so the unmount blur doesn't re-commit after a deliberate
// Enter/Escape, and stopPropagation so clicking into it doesn't start a drag.
const FloatTitleEditor = ({
  dispatch,
  node,
  onDone,
}: TitleProps & { onDone: () => void }): ReactNode => {
  const ref = useRef<HTMLInputElement | null>(null);
  const done = useRef(false);
  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  const commit = (value: string): void => {
    const trimmed = value.trim();
    if (trimmed && trimmed !== floatTitle(node)) {
      dispatch({ floatId: node.id, name: trimmed, type: "renameFloat" });
    }
    onDone();
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>): void => {
    if (event.key === "Enter") {
      done.current = true;
      commit(event.currentTarget.value);
    } else if (event.key === "Escape") {
      done.current = true;
      onDone();
    }
  };

  const handleBlur = (event: ReactFocusEvent<HTMLInputElement>): void => {
    if (done.current) {
      return;
    }
    done.current = true;
    commit(event.currentTarget.value);
  };

  return (
    <input
      aria-label={`Rename ${floatTitle(node)}`}
      data-dashfoo="float-rename"
      defaultValue={floatTitle(node)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onPointerDown={(event) => event.stopPropagation()}
      ref={ref}
      style={titleStyle}
      type="text"
    />
  );
};

// The window title: the float's name, double-click to rename. A static layout
// (renamable=false) shows the name as plain, non-editable text.
const FloatTitle = ({
  dispatch,
  node,
  renamable,
}: TitleProps & { renamable: boolean }): ReactNode => {
  const [editing, setEditing] = useState(false);
  if (renamable && editing) {
    return <FloatTitleEditor dispatch={dispatch} node={node} onDone={() => setEditing(false)} />;
  }
  return (
    <span
      data-dashfoo="float-title"
      onDoubleClick={renamable ? () => setEditing(true) : undefined}
      style={titleStyle}
      title={renamable ? "Double-click to rename" : undefined}
    >
      {floatTitle(node)}
    </span>
  );
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
  const draggableTabs = useLayout((state) => state.draggableTabs);
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

  // Restore (un-minimize) is a structural edit, so a static layout cannot do it.
  const restore = (): void => {
    if (!editable) {
      return;
    }
    dispatch({ floatId: node.id, minimized: false, type: "setFloatMinimized" });
  };

  // One pointerdown handler for the title bar / chip (move) and the resize handles;
  // the moving edges ride the target's data-edge, so it can be assigned directly to
  // onPointerDown (no per-render closure that reads refs). Raise-to-front is wired
  // separately (onPointerDownCapture on the frame), so it still works for body and
  // tab clicks — and even while a static layout has move/resize switched off.
  const handlePointerDown = (event: ReactPointerEvent<HTMLElement>): void => {
    const panel = panelRef.current;
    // A static layout never moves or resizes a float — no gesture, no moveFloat.
    if (!panel || !editable) {
      return;
    }
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
    // Capture is deferred to the first real move (see handlePointerMove) so a tap or
    // double-click on the title bar isn't swallowed by the capture and can reach the
    // rename handler.
  };

  const handlePointerMove = (event: ReactPointerEvent): void => {
    const gesture = gestureRef.current;
    const panel = panelRef.current;
    if (!gesture || !panel || event.pointerId !== gesture.pointerId) {
      return;
    }
    const dx = event.clientX - gesture.startX;
    const dy = event.clientY - gesture.startY;
    if (!movedRef.current) {
      // Below the slop it is still a (possible) tap — don't move or capture yet.
      if (Math.hypot(dx, dy) <= TAP_SLOP) {
        return;
      }
      movedRef.current = true;
      panel.setPointerCapture(gesture.pointerId);
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
    // A tap (no movement, so capture was never taken) restores the chip, or is a
    // no-op on the title bar — leaving the click/double-click to reach the title.
    // Only a real drag captured the pointer and commits the new rect.
    if (!movedRef.current) {
      if (node.minimized) {
        restore();
      }
      return;
    }
    panelRef.current?.releasePointerCapture(event.pointerId);
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
        onPointerDownCapture={onFocus}
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
      // Capture so a click anywhere in the float — body, tab, or chrome — raises it
      // above the others before any child handler runs, even when a static layout
      // has move/resize off.
      onPointerDownCapture={onFocus}
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
      <div
        data-dashfoo="float-titlebar"
        onPointerDown={handlePointerDown}
        // A static layout's title bar doesn't drag, so don't dangle a grab cursor.
        style={editable ? titleBarStyle : { ...titleBarStyle, cursor: "default" }}
      >
        <span aria-hidden="true" data-dashfoo="float-grip">
          <GripIcon />
        </span>
        <FloatTitle dispatch={dispatch} node={node} renamable={editable} />
        {editable && (
          <>
            <button
              aria-label="Minimize panel"
              data-dashfoo="float-minimize"
              onClick={() =>
                dispatch({ floatId: node.id, minimized: true, type: "setFloatMinimized" })
              }
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
          </>
        )}
      </div>
      <div data-dashfoo="float-body" style={bodyStyle}>
        <LayoutRoot
          closableTabs={closableTabs}
          dispatch={dispatch}
          draggableTabs={draggableTabs}
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
          {/* Its own drag layer, joined to the shared manager above, so tabs drag
              between this float and the main layout (and other floats). */}
          <DragProvider>
            <RowView node={node.layout} />
          </DragProvider>
        </LayoutRoot>
      </div>
      {editable &&
        RESIZE_HANDLES.map((handle) => (
          <div
            data-dashfoo="float-resize"
            data-edge={handle.key}
            key={handle.key}
            onPointerDown={handlePointerDown}
            style={{ position: "absolute", touchAction: "none", zIndex: 1, ...handle.style }}
          />
        ))}
      {editable && (
        <>
          <span
            aria-hidden="true"
            data-dashfoo="float-resize-cue"
            style={{ ...resizeGripStyle, right: 2 }}
          >
            <ResizeGripIcon />
          </span>
          <span
            aria-hidden="true"
            data-dashfoo="float-resize-cue"
            style={{ ...resizeGripStyle, left: 2, transform: "scaleX(-1)" }}
          >
            <ResizeGripIcon />
          </span>
        </>
      )}
    </div>
  );
};

export { FloatPanel };
export type { FloatPanelProps };
