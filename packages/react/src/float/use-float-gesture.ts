"use client";

import type { Geometry } from "@dashfoo/core";
import type { PointerEvent as ReactPointerEvent } from "react";
import { useRef } from "react";

import { startsOnControl } from "../lib/interactive";

import type { ResizeEdges, Scale, Size } from "./float-geometry";
import {
  clampToBounds,
  floatGeometryStyle,
  layoutScale,
  resizeRect,
  toLayoutRect,
} from "./float-geometry";

const TAP_SLOP = 4;

const releaseCapture = (panel: HTMLElement, pointerId: number): void => {
  if (panel.hasPointerCapture(pointerId)) {
    panel.releasePointerCapture(pointerId);
  }
};

const applyGeometry = (panel: HTMLElement, geometry: Geometry): void => {
  for (const [property, value] of Object.entries(floatGeometryStyle(geometry))) {
    panel.style.setProperty(property, value);
  }
};

/**
 * `moved` and `latest` live here because they only mean anything mid-gesture.
 * `visible` is the size the clamp keeps on screen: the chip's own when minimized.
 * `scale` converts screen pixels to layout pixels under CSS `zoom` or a scale transform.
 */
type Gesture = {
  bounds: Size;
  edges: ResizeEdges | null;
  latest: Geometry;
  moved: boolean;
  pointerId: number;
  scale: Scale;
  start: Geometry;
  startX: number;
  startY: number;
  visible: Size | undefined;
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
  onPointerDown: (event: ReactPointerEvent) => void;
  onPointerMove: (event: ReactPointerEvent) => void;
  onPointerUp: (event: ReactPointerEvent) => void;
};

/** Writes the same `floatGeometryStyle` vars the panel renders, so a move never re-renders. */
type FloatGesture = {
  handlers: FloatGestureHandlers;
  ref: (element: HTMLElement | null) => void;
  startResize: (event: ReactPointerEvent, edges: ResizeEdges) => void;
};

// shortcut: a hand-written pointer gesture instead of a dnd-kit draggable, upgrade once dnd-kit#2055 ships and Feedback allows a per-draggable overlay (ADR 0005)
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

  const beginGesture = (event: ReactPointerEvent, edges: ResizeEdges | null): void => {
    const panel = panelRef.current;

    if (!panel || !editable) {
      return;
    }

    const prior = gestureRef.current;

    if (prior) {
      releaseCapture(panel, prior.pointerId);
    }

    const parent = panel.offsetParent instanceof HTMLElement ? panel.offsetParent : null;
    const scale = layoutScale(panel);

    const rect = toLayoutRect(
      panel.getBoundingClientRect(),
      parent?.getBoundingClientRect(),
      scale,
    );

    const visibleGeometry = {
      height: minimized ? geometry.height : rect.height,
      left: rect.left,
      top: rect.top,
      width: minimized ? geometry.width : rect.width,
    };

    const gesture: Gesture = {
      bounds: { height: parent?.clientHeight ?? 0, width: parent?.clientWidth ?? 0 },
      edges,
      latest: visibleGeometry,
      moved: false,
      pointerId: event.pointerId,
      scale,
      start: visibleGeometry,
      startX: event.clientX,
      startY: event.clientY,
      visible: minimized ? { height: rect.height, width: rect.width } : undefined,
    };

    gestureRef.current = gesture;

    if (gesture.edges) {
      panel.setPointerCapture(event.pointerId);
    }
  };

  const handlePointerDown = (event: ReactPointerEvent): void => {
    if (!startsOnControl(event.target, event.currentTarget)) {
      beginGesture(event, null);
    }
  };

  const handlePointerUp = (event: ReactPointerEvent): void => {
    const gesture = gestureRef.current;

    if (!gesture || event.pointerId !== gesture.pointerId) {
      return;
    }

    gestureRef.current = null;

    const panel = panelRef.current;

    if (panel) {
      releaseCapture(panel, event.pointerId);
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

    const dx = (event.clientX - gesture.startX) / gesture.scale.x;
    const dy = (event.clientY - gesture.startY) / gesture.scale.y;

    if (!gesture.moved) {
      if (Math.hypot(event.clientX - gesture.startX, event.clientY - gesture.startY) <= TAP_SLOP) {
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
          gesture.visible,
        );

    gesture.latest = next;
    applyGeometry(panel, next);
  };

  const handlePointerCancel = (event: ReactPointerEvent): void => {
    const gesture = gestureRef.current;
    const panel = panelRef.current;

    if (!gesture || !panel || event.pointerId !== gesture.pointerId) {
      return;
    }

    gestureRef.current = null;
    releaseCapture(panel, event.pointerId);

    if (gesture.moved) {
      applyGeometry(panel, geometry);
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
    startResize: beginGesture,
  };
};

export { useFloatGesture };

export type { FloatGesture, FloatGestureOptions };
