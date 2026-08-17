"use client";

import type { Geometry } from "@dashfoo/core";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { useRef } from "react";

import { EDGE_BY_KEY } from "../components/float-resize-handles";
import type { ResizeEdges, Size } from "../lib/float-geometry";
import { clampToBounds, resizeRect } from "../lib/float-geometry";

const CHIP_SIZE: Size = { height: 34, width: 168 };

const TAP_SLOP = 4;

/**
 * `moved` and `latest` live here rather than in refs of their own: they only
 * mean anything while a gesture is in flight, and as separate refs a cancelled
 * gesture left `moved` set for the next one to clear.
 */
type Gesture = {
  bounds: Size;
  edges: ResizeEdges | null;
  latest: Geometry;
  moved: boolean;
  pointerId: number;
  start: Geometry;
  startX: number;
  startY: number;
};

type FloatGestureOptions = {
  editable: boolean;
  geometry: Geometry;
  minimized: boolean;
  onCommit: (geometry: Geometry) => void;
  onTap: () => void;
};

type FloatGestureHandlers = {
  onPointerCancel: (event: ReactPointerEvent) => void;
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
  onPointerMove: (event: ReactPointerEvent) => void;
  onPointerUp: (event: ReactPointerEvent) => void;
};

type FloatGesture = {
  handlers: FloatGestureHandlers;
  ref: (element: HTMLElement | null) => void;
  style: CSSProperties;
};

/**
 * Moving and resizing writes straight to the panel's inline style and only
 * dispatches on pointer-up: routing every pointermove through the model would
 * re-render the whole layout tree behind the float.
 */
const useFloatGesture = ({
  editable,
  geometry,
  minimized,
  onCommit,
  onTap,
}: FloatGestureOptions): FloatGesture => {
  const panelRef = useRef<HTMLElement | null>(null);
  const gestureRef = useRef<Gesture | null>(null);

  const setPanel = (element: HTMLElement | null): void => {
    panelRef.current = element;
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
    const edgeKey = event.currentTarget.dataset.edge;

    const parent = panel.offsetParent instanceof HTMLElement ? panel.offsetParent : null;
    const gesture: Gesture = {
      bounds: { height: parent?.clientHeight ?? 0, width: parent?.clientWidth ?? 0 },
      edges: edgeKey === undefined ? null : (EDGE_BY_KEY.get(edgeKey) ?? null),
      latest: geometry,
      moved: false,
      pointerId: event.pointerId,
      start: geometry,
      startX: event.clientX,
      startY: event.clientY,
    };
    gestureRef.current = gesture;

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
    if (panel?.hasPointerCapture?.(event.pointerId) === true) {
      panel.releasePointerCapture(event.pointerId);
    }

    if (!gesture.moved) {
      onTap();
      return;
    }
    onCommit(gesture.latest);
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
    if (!gesture.moved) {
      if (Math.hypot(dx, dy) <= TAP_SLOP) {
        return;
      }
      gesture.moved = true;

      if (!gesture.edges) {
        panel.setPointerCapture(gesture.pointerId);
      }
    }
    const next = gesture.edges
      ? resizeRect(gesture.start, gesture.edges, dx, dy)
      : clampToBounds(
          { ...gesture.start, left: gesture.start.left + dx, top: gesture.start.top + dy },
          gesture.bounds,
          minimized ? CHIP_SIZE : undefined,
        );

    gesture.latest = next;
    panel.style.left = `${next.left}px`;
    panel.style.top = `${next.top}px`;

    if (!minimized) {
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
    if (!gesture.moved) {
      return;
    }
    panel.style.left = `${gesture.start.left}px`;
    panel.style.top = `${gesture.start.top}px`;
    if (!minimized) {
      panel.style.width = `${gesture.start.width}px`;
      panel.style.height = `${gesture.start.height}px`;
    }
  };

  return {
    handlers: {
      onPointerCancel: handlePointerCancel,
      onPointerDown: handlePointerDown,
      onPointerMove: handlePointerMove,
      onPointerUp: handlePointerUp,
    },
    ref: setPanel,
    style: minimized
      ? { left: geometry.left, top: geometry.top }
      : {
          height: geometry.height,
          left: geometry.left,
          top: geometry.top,
          width: geometry.width,
        },
  };
};

export { useFloatGesture };
export type { FloatGesture, FloatGestureOptions };
