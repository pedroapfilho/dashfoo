"use client";

import type { Geometry } from "@dashfoo/core";
import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { useRef } from "react";

import { EDGE_BY_KEY } from "../components/float-resize-handles";
import type { ResizeEdges, Size } from "../lib/float-geometry";
import { clampToBounds, resizeRect } from "../lib/float-geometry";

const CHIP_SIZE: Size = { height: 34, width: 168 };

const TAP_SLOP = 4;

/** `moved` and `latest` live here because they only mean anything mid-gesture. */
type Gesture = {
  bounds: Size;
  edges: ResizeEdges | null;
  initialStyle: Record<string, string>;
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
    const rect = panel.getBoundingClientRect();
    const visibleGeometry = {
      height: minimized ? geometry.height : rect.height,
      left: rect.left,
      top: rect.top,
      width: minimized ? geometry.width : rect.width,
    };
    const gesture: Gesture = {
      bounds: { height: parent?.clientHeight ?? 0, width: parent?.clientWidth ?? 0 },
      edges: edgeKey === undefined ? null : (EDGE_BY_KEY.get(edgeKey) ?? null),
      initialStyle: {
        "--dashfoo-float-height": panel.style.getPropertyValue("--dashfoo-float-height"),
        "--dashfoo-float-left": panel.style.getPropertyValue("--dashfoo-float-left"),
        "--dashfoo-float-top": panel.style.getPropertyValue("--dashfoo-float-top"),
        "--dashfoo-float-width": panel.style.getPropertyValue("--dashfoo-float-width"),
      },
      latest: visibleGeometry,
      moved: false,
      pointerId: event.pointerId,
      start: visibleGeometry,
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
    panel.style.setProperty("--dashfoo-float-left", `${next.left}px`);
    panel.style.setProperty("--dashfoo-float-top", `${next.top}px`);

    if (!minimized) {
      panel.style.setProperty("--dashfoo-float-width", `${next.width}px`);
      panel.style.setProperty("--dashfoo-float-height", `${next.height}px`);
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
    for (const [property, value] of Object.entries(gesture.initialStyle)) {
      panel.style.setProperty(property, value);
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
    style: {
      "--dashfoo-float-height": `${geometry.height}px`,
      "--dashfoo-float-left": `${geometry.left}px`,
      "--dashfoo-float-top": `${geometry.top}px`,
      "--dashfoo-float-width": `${geometry.width}px`,
    },
  };
};

export { useFloatGesture };
export type { FloatGesture, FloatGestureOptions };
