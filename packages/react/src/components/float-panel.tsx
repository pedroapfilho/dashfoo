"use client";

import type { Action, Dashfoo, FloatNode, Geometry, GlobalAttributes } from "@dashfoo/core";
import type { CSSProperties, PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { useRef, useState } from "react";

import { useLayout } from "../hooks/layout-store";
import { useInlineRename } from "../hooks/use-inline-rename";
import type { ResizeEdges, Size } from "../lib/float-geometry";
import { clampToBounds, resizeRect } from "../lib/float-geometry";

import { DragProvider } from "./drag-adapter";
import { EDGE_BY_KEY, RESIZE_HANDLES } from "./float-resize-handles";
import { LayoutRoot } from "./layout-root";
import { RowView } from "./row-view";
import { DockIcon, FloatIcon, GripIcon, MinimizeIcon } from "./tabset-icons";

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

const CHIP_SIZE: Size = { height: 34, width: 168 };

const TAP_SLOP = 4;

type Gesture = {
  bounds: Size;
  edges: ResizeEdges | null;
  pointerId: number;
  start: Geometry;
  startX: number;
  startY: number;
};

type TitleProps = { dispatch: (action: Action) => void; node: FloatNode };

const FloatTitleEditor = ({
  dispatch,
  node,
  onDone,
}: TitleProps & { onDone: () => void }): ReactNode => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { handleBlur, handleKeyDown } = useInlineRename({
    currentName: floatTitle(node),
    inputRef,
    onCommit: (name) => dispatch({ floatId: node.id, name, type: "renameFloat" }),
    onDone,
  });

  return (
    <input
      aria-label={`Rename ${floatTitle(node)}`}
      data-dashfoo="float-rename"
      defaultValue={floatTitle(node)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onPointerDown={(event) => event.stopPropagation()}
      ref={inputRef}
      style={titleStyle}
      type="text"
    />
  );
};

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

  const restore = (): void => {
    if (!editable) {
      return;
    }
    dispatch({ floatId: node.id, minimized: false, type: "setFloatMinimized" });
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLElement>): void => {
    const panel = panelRef.current;

    if (!panel || !editable) {
      return;
    }

    const prior = gestureRef.current;
    if (prior && panel.hasPointerCapture?.(prior.pointerId)) {
      panel.releasePointerCapture(prior.pointerId);
    }
    movedRef.current = false;
    const edgeKey = event.currentTarget.dataset.edge;

    const parent = panel.offsetParent as HTMLElement | null;
    const gesture: Gesture = {
      bounds: { height: parent?.clientHeight ?? 0, width: parent?.clientWidth ?? 0 },
      edges: edgeKey ? (EDGE_BY_KEY.get(edgeKey) ?? null) : null,
      pointerId: event.pointerId,
      start: node.geometry,
      startX: event.clientX,
      startY: event.clientY,
    };
    gestureRef.current = gesture;
    latestRef.current = node.geometry;

    if (gesture.edges) {
      panel.setPointerCapture(event.pointerId);
    }
  };

  const handlePointerUp = (event: ReactPointerEvent): void => {
    const gesture = gestureRef.current;
    if (!gesture || event.pointerId !== gesture.pointerId) {
      return;
    }
    gestureRef.current = null;

    const panel = panelRef.current;
    if (panel?.hasPointerCapture?.(event.pointerId)) {
      panel.releasePointerCapture(event.pointerId);
    }

    if (!movedRef.current) {
      if (node.minimized) {
        restore();
      }
      return;
    }
    dispatch({ floatId: node.id, geometry: latestRef.current, type: "moveFloat" });
  };

  const handlePointerMove = (event: ReactPointerEvent): void => {
    const gesture = gestureRef.current;
    const panel = panelRef.current;
    if (!gesture || !panel || event.pointerId !== gesture.pointerId) {
      return;
    }

    if (event.buttons === 0) {
      handlePointerUp(event);
      return;
    }
    const dx = event.clientX - gesture.startX;
    const dy = event.clientY - gesture.startY;
    if (!movedRef.current) {
      if (Math.hypot(dx, dy) <= TAP_SLOP) {
        return;
      }
      movedRef.current = true;

      if (!gesture.edges) {
        panel.setPointerCapture(gesture.pointerId);
      }
    }
    const next = gesture.edges
      ? resizeRect(gesture.start, gesture.edges, dx, dy)
      : clampToBounds(
          { ...gesture.start, left: gesture.start.left + dx, top: gesture.start.top + dy },
          gesture.bounds,
          node.minimized ? CHIP_SIZE : undefined,
        );

    latestRef.current = next;
    panel.style.left = `${next.left}px`;
    panel.style.top = `${next.top}px`;

    if (!node.minimized) {
      panel.style.width = `${next.width}px`;
      panel.style.height = `${next.height}px`;
    }
  };

  const handlePointerCancel = (event: ReactPointerEvent): void => {
    const gesture = gestureRef.current;
    const panel = panelRef.current;
    if (!gesture || !panel || event.pointerId !== gesture.pointerId) {
      return;
    }
    gestureRef.current = null;
    if (panel.hasPointerCapture?.(event.pointerId)) {
      panel.releasePointerCapture(event.pointerId);
    }
    if (!movedRef.current) {
      return;
    }
    panel.style.left = `${gesture.start.left}px`;
    panel.style.top = `${gesture.start.top}px`;
    if (!node.minimized) {
      panel.style.width = `${gesture.start.width}px`;
      panel.style.height = `${gesture.start.height}px`;
    }
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
        onPointerCancel={handlePointerCancel}
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
      onPointerCancel={handlePointerCancel}
      onPointerDownCapture={onFocus}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      ref={setPanel}
      style={{
        height: node.geometry.height,
        left: node.geometry.left,

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
              title="Minimize panel"
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
              title="Dock panel back"
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
    </div>
  );
};

export { FloatPanel, FloatTitleEditor };
export type { FloatPanelProps };
