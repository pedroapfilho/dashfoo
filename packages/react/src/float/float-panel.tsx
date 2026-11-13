"use client";

import type { Action, FloatNode } from "@dashfoo/core";
import { DEFAULT_FLOAT_NAME } from "@dashfoo/core";
import type { CSSProperties, ReactNode } from "react";
import { useRef, useState } from "react";

import { DragLayer } from "../drag/drag-layer";
import { INSIDE_FLOAT } from "../layout/capabilities";
import { LayoutOverrides } from "../layout/layout-root";
import type { LayoutState } from "../layout/layout-store";
import { useLayout } from "../layout/layout-store";
import { RowView } from "../layout/row-view";
import { useInlineRename } from "../lib/use-inline-rename";
import { DockIcon, FloatIcon, GripIcon, MinimizeIcon } from "../ui/icons";

import { InsideFloatContext } from "./float-context";
import { RESIZE_HANDLES } from "./float-geometry";
import { useFloatGesture } from "./use-float-gesture";

const floatTitle = (node: FloatNode): string => node.name ?? DEFAULT_FLOAT_NAME;

/** `maximizedTabsetId` is cleared here, not only by `normalize`: the parent store syncs after render. */
const FLOAT_OVERRIDES: Partial<LayoutState> = { ...INSIDE_FLOAT, maximizedTabsetId: undefined };

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
      ref={inputRef}
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
  // Not `canDock`: a frozen tree (the compact view) still docks a float back, or one saved on a wide screen could never rejoin it.
  const editable = useLayout((state) => state.editable);

  const minimized = node.minimized === true;

  const restore = (): void => {
    if (!editable) {
      return;
    }

    dispatch({ floatId: node.id, minimized: false, type: "setFloatMinimized" });
  };

  const { handlers, ref, startResize } = useFloatGesture({
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
    "--dashfoo-float-height": `${node.geometry.height}px`,
    "--dashfoo-float-left": `${node.geometry.left}px`,
    "--dashfoo-float-top": `${node.geometry.top}px`,
    "--dashfoo-float-width": `${node.geometry.width}px`,
    "--dashfoo-float-z": zIndex,
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
        data-editable={editable || undefined}
        onPointerDown={onPointerDown}
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
              title="Dock panel back"
              type="button"
            >
              <DockIcon />
            </button>
          </>
        )}
      </div>
      <div data-dashfoo="float-body">
        <LayoutOverrides overrides={FLOAT_OVERRIDES}>
          <InsideFloatContext.Provider value>
            <DragLayer>
              <RowView node={node.layout} />
            </DragLayer>
          </InsideFloatContext.Provider>
        </LayoutOverrides>
      </div>
      {editable &&
        RESIZE_HANDLES.map((handle) => (
          <div
            data-dashfoo="float-resize"
            data-edge={handle.key}
            key={handle.key}
            onPointerDown={(event) => {
              startResize(event, handle.edges);
            }}
          />
        ))}
    </div>
  );
};

export { FloatPanel, FloatTitleEditor };

export type { FloatPanelProps };
