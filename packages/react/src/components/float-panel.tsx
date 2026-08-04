"use client";

import type { Action, FloatNode } from "@dashfoo/core";
import type { CSSProperties, ReactNode } from "react";
import { useRef, useState } from "react";

import type { LayoutState } from "../hooks/layout-store";
import { useLayout } from "../hooks/layout-store";
import { useFloatGesture } from "../hooks/use-float-gesture";
import { useInlineRename } from "../hooks/use-inline-rename";

import { DragProvider } from "./drag-adapter";
import { RESIZE_HANDLES } from "./float-resize-handles";
import { LayoutOverrides } from "./layout-root";
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

const FLOAT_OVERRIDES: Partial<LayoutState> = {
  draggableTabsets: false,
  floatable: false,
  maximizable: false,
  maximizedTabsetId: undefined,
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
    onCommit: (name) => {
      dispatch({ floatId: node.id, name, type: "renameFloat" });
    },
    onDone,
  });

  return (
    <input
      aria-label={`Rename ${floatTitle(node)}`}
      data-dashfoo="float-rename"
      defaultValue={floatTitle(node)}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onPointerDown={(event) => {
        event.stopPropagation();
      }}
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
    return (
      <FloatTitleEditor
        dispatch={dispatch}
        node={node}
        onDone={() => {
          setEditing(false);
        }}
      />
    );
  }
  return (
    <span
      data-dashfoo="float-title"
      onDoubleClick={
        renamable
          ? () => {
              setEditing(true);
            }
          : undefined
      }
      style={titleStyle}
      title={renamable ? "Double-click to rename" : undefined}
    >
      {floatTitle(node)}
    </span>
  );
};

type FloatPanelProps = {
  node: FloatNode;
  onFocus: () => void;
  zIndex: number;
};

const FloatPanel = ({ node, onFocus, zIndex }: FloatPanelProps): ReactNode => {
  const dispatch = useLayout((state) => state.dispatch);
  const editable = useLayout((state) => state.editable);

  const minimized = node.minimized === true;

  const restore = (): void => {
    if (!editable) {
      return;
    }
    dispatch({ floatId: node.id, minimized: false, type: "setFloatMinimized" });
  };

  const { handlers, ref, style } = useFloatGesture({
    editable,
    geometry: node.geometry,
    minimized,
    onCommit: (geometry) => {
      dispatch({ floatId: node.id, geometry, type: "moveFloat" });
    },
    onTap: () => {
      if (minimized) {
        restore();
      }
    },
  });
  const { onPointerDown, ...rootHandlers } = handlers;
  const frameStyle: CSSProperties = {
    ...style,
    pointerEvents: "auto",
    position: "absolute",
    zIndex,
  };

  if (minimized) {
    return (
      <button
        {...rootHandlers}
        aria-label={`Restore ${floatTitle(node)} panel`}
        data-dashfoo="float-chip"
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            restore();
          }
        }}
        onPointerDown={onPointerDown}
        onPointerDownCapture={onFocus}
        ref={ref}
        style={frameStyle}
        title={floatTitle(node)}
        type="button"
      >
        <FloatIcon />
        <span data-dashfoo="float-chip-label">{floatTitle(node)}</span>
      </button>
    );
  }

  return (
    <div
      {...rootHandlers}
      data-dashfoo="float"
      onPointerDownCapture={onFocus}
      ref={ref}
      style={frameStyle}
    >
      <div
        data-dashfoo="float-titlebar"
        onPointerDown={onPointerDown}
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
              onClick={() => {
                dispatch({ floatId: node.id, minimized: true, type: "setFloatMinimized" });
              }}
              onPointerDown={(event) => {
                event.stopPropagation();
              }}
              style={dockButtonStyle}
              title="Minimize panel"
              type="button"
            >
              <MinimizeIcon />
            </button>
            <button
              aria-label="Dock panel back into the main layout"
              data-dashfoo="float-dock"
              onClick={() => {
                dispatch({ floatId: node.id, type: "dockFloat" });
              }}
              onPointerDown={(event) => {
                event.stopPropagation();
              }}
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
        <LayoutOverrides overrides={FLOAT_OVERRIDES}>
          <DragProvider>
            <RowView node={node.layout} />
          </DragProvider>
        </LayoutOverrides>
      </div>
      {editable &&
        RESIZE_HANDLES.map((handle) => (
          <div
            data-dashfoo="float-resize"
            data-edge={handle.key}
            key={handle.key}
            onPointerDown={onPointerDown}
            style={{ position: "absolute", touchAction: "none", zIndex: 1, ...handle.style }}
          />
        ))}
    </div>
  );
};

export { FloatPanel, FloatTitleEditor };
export type { FloatPanelProps };
