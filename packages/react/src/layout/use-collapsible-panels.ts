"use client";

import type { Action, RowNode, TabsetNode } from "@dashfoo/core";
import { canCollapseTabset } from "@dashfoo/core";
import type { RefObject } from "react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { GroupImperativeHandle, PanelImperativeHandle } from "react-resizable-panels";

import {
  expandToMinimum,
  keepCollapsedWeights,
  measureHeader,
  sameSet,
  spaceForPanels,
} from "./collapse-geometry";

type LayoutChild = RowNode["children"][number];

/** Strip thickness in pixels, by the id of each collapsible child. */
type HeaderSizes = ReadonlyMap<string, number>;

type CollapsiblePanelsOptions = {
  dispatch: (action: Action) => void;
  groupElement: HTMLElement | null;
  groupRef: RefObject<GroupImperativeHandle | null>;
  minPixels: (child: LayoutChild) => number | undefined;
  node: RowNode;
  panelIdOf: (childId: string) => string;
};

type CollapsiblePanels = {
  /** Shown collapsed: collapsed in the model, or collapsed to fit. */
  collapsedIds: ReadonlySet<string>;
  fitIds: ReadonlySet<string>;
  headerSizes: HeaderSizes;
  isCollapsible: (child: LayoutChild) => child is TabsetNode;
  registerElement: (id: string, element: HTMLDivElement | null) => void;
  registerHandle: (id: string, handle: PanelImperativeHandle | null) => void;
  /** Turns a user resize into one action: a collapse or expand when the drag crossed a minimum, else new weights. */
  settle: (sizes: Array<number>) => void;
};

const EMPTY: ReadonlySet<string> = new Set();

/**
 * Keeps rrp's collapsed panels in step with the model, and collapses panels to
 * fit a split too small for its minimums without touching the model.
 */
const useCollapsiblePanels = ({
  dispatch,
  groupElement,
  groupRef,
  minPixels,
  node,
  panelIdOf,
}: CollapsiblePanelsOptions): CollapsiblePanels => {
  const handles = useRef(new Map<string, PanelImperativeHandle>());
  const elements = useRef(new Map<string, HTMLDivElement>());
  const wasCollapsed = useRef(new Map<string, boolean>());
  const [fitIds, setFitIds] = useState<ReadonlySet<string>>(EMPTY);
  const [headerSizes, setHeaderSizes] = useState<HeaderSizes>(new Map());

  const isCollapsible = useCallback(
    (child: LayoutChild): child is TabsetNode =>
      child.type === "tabset" &&
      child.collapsible === true &&
      (child.collapsed === true || canCollapseTabset(node, child)),
    [node],
  );

  const collapsedIds = useMemo(
    () =>
      new Set([
        ...fitIds,
        ...node.children.flatMap((child) =>
          child.type === "tabset" && child.collapsed === true ? [child.id] : [],
        ),
      ]),
    [fitIds, node.children],
  );

  /** Applies collapses and expands the model asked for. */
  const followModel = (targets: Set<string>): void => {
    for (const child of node.children) {
      const handle = handles.current.get(child.id);

      if (!isCollapsible(child) || !handle || headerSizes.get(child.id) === undefined) {
        continue;
      }

      const wanted = child.collapsed === true;
      const expandRequested = wasCollapsed.current.get(child.id) === true && !wanted;
      wasCollapsed.current.set(child.id, wanted);

      if (wanted) {
        targets.add(child.id);
        handle.collapse();
      } else if (expandRequested && handle.isCollapsed()) {
        handle.expand();
        expandToMinimum(handle, minPixels(child));
      }
    }
  };

  /**
   * rrp lets panels shrink below their minimums when the container does, so
   * this collapses collapsible children, last first, until the minimums fit,
   * and expands them again, first first, once there is room.
   */
  const collapseToFit = (targets: Set<string>): void => {
    if (!groupElement) {
      return;
    }

    const available = spaceForPanels(groupElement, node.orientation);
    let required = 0;
    let expandedCount = 0;

    const candidates: Array<{
      handle: PanelImperativeHandle;
      id: string;
      minimum: number;
      saving: number;
    }> = [];

    for (const child of node.children) {
      const handle = isCollapsible(child) ? handles.current.get(child.id) : undefined;
      const header = headerSizes.get(child.id);
      const minimum = minPixels(child) ?? 0;

      if (handle?.isCollapsed() === true && header !== undefined) {
        required += header;
      } else {
        required += minimum;
        expandedCount += 1;
      }

      if (handle && isCollapsible(child) && child.collapsed !== true && header !== undefined) {
        candidates.push({ handle, id: child.id, minimum, saving: minimum - header });
      }
    }

    for (const { handle, minimum, saving } of candidates) {
      if (handle.isCollapsed() && required + saving <= available) {
        expandToMinimum(handle, minimum);
        required += saving;
        expandedCount += 1;
      }
    }

    for (const { handle, id, saving } of candidates.toReversed()) {
      if (required <= available || expandedCount <= 1) {
        break;
      }

      if (!handle.isCollapsed()) {
        targets.add(id);
        handle.collapse();
        required -= saving;
        expandedCount -= 1;
      }
    }
  };

  /**
   * rrp refuses `collapse()` while its layout breaks the minimums (a saved
   * layout that never fit), so the whole layout is set instead: collapsed
   * panels at their strip size, the rest sharing what is left by weight.
   */
  const forceCollapsed = (targets: ReadonlySet<string>): void => {
    const group = groupRef.current;

    if (!group || !groupElement) {
      return;
    }

    const available = spaceForPanels(groupElement, node.orientation);
    const shares = node.children.map((child) => (targets.has(child.id) ? undefined : child.weight));
    const collapsedPercent = (id: string): number => ((headerSizes.get(id) ?? 0) / available) * 100;
    const rest = 100 - [...targets].reduce((sum, id) => sum + collapsedPercent(id), 0);
    const weightTotal = shares.reduce<number>((sum, share) => sum + (share ?? 0), 0);

    const layout: Record<string, number> = {};

    for (const [index, child] of node.children.entries()) {
      const share = shares[index];
      layout[panelIdOf(child.id)] =
        share === undefined ? collapsedPercent(child.id) : (rest * share) / weightTotal;
    }

    group.setLayout(layout);
  };

  /** rrp throws from a panel handle until its group has registered the panel. */
  const registered = (): boolean => {
    const layout = groupRef.current?.getLayout();

    return layout !== undefined && node.children.every((child) => panelIdOf(child.id) in layout);
  };

  const measureHeaders = (): HeaderSizes => {
    const sizes = new Map<string, number>();

    for (const child of node.children) {
      const element = elements.current.get(child.id);
      const size = isCollapsible(child) && element ? measureHeader(element) : undefined;

      if (size !== undefined) {
        sizes.set(child.id, size);
      }
    }

    return sizes;
  };

  const reconcile = (): void => {
    const measured = measureHeaders();
    const keys = new Set([...measured.keys(), ...headerSizes.keys()]);

    // A new strip size re-renders the panels' `collapsedSize` first; the
    // effect then reconciles against it.
    if (![...keys].every((key) => measured.get(key) === headerSizes.get(key))) {
      setHeaderSizes(measured);

      return;
    }

    if (!node.children.some(isCollapsible)) {
      setFitIds((current) => (current.size === 0 ? current : EMPTY));

      return;
    }

    if (!registered()) {
      return;
    }

    const targets = new Set<string>();
    followModel(targets);
    collapseToFit(targets);

    if ([...targets].some((id) => handles.current.get(id)?.isCollapsed() === false)) {
      forceCollapsed(targets);
    }

    const nextFit = new Set(
      node.children.flatMap((child) =>
        isCollapsible(child) &&
        child.collapsed !== true &&
        handles.current.get(child.id)?.isCollapsed() === true
          ? [child.id]
          : [],
      ),
    );

    setFitIds((current) => (sameSet(current, nextFit) ? current : nextFit));
  };

  const reconcileRef = useRef(reconcile);

  useLayoutEffect(() => {
    reconcileRef.current = reconcile;
  });

  useLayoutEffect(() => {
    reconcileRef.current();
  }, [headerSizes, node.children]);

  // Only the container's own size can make room for a panel collapsed to fit;
  // a separator drag leaves it unchanged, so this never fights the user. The
  // frame lets rrp take in the new size first, or it refuses the resize.
  useEffect(() => {
    if (!groupElement || typeof ResizeObserver === "undefined") {
      return undefined;
    }

    let frame = 0;

    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        reconcileRef.current();
      });
    });

    observer.observe(groupElement);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [groupElement]);

  const settle = (sizes: Array<number>): void => {
    for (const child of node.children) {
      const shown = isCollapsible(child) ? handles.current.get(child.id)?.isCollapsed() : undefined;

      if (
        child.type === "tabset" &&
        shown !== undefined &&
        shown !== (child.collapsed === true) &&
        !(shown && fitIds.has(child.id))
      ) {
        dispatch({ collapsed: shown, tabsetId: child.id, type: "setTabsetCollapsed" });

        return;
      }
    }

    dispatch({
      rowId: node.id,
      type: "adjustSplit",
      weights: keepCollapsedWeights(node, sizes, collapsedIds),
    });
  };

  return {
    collapsedIds,
    fitIds,
    headerSizes,
    isCollapsible,
    registerElement: (id, element) => {
      if (element) {
        elements.current.set(id, element);
      } else {
        elements.current.delete(id);
      }
    },
    registerHandle: (id, handle) => {
      if (handle) {
        handles.current.set(id, handle);
      } else {
        handles.current.delete(id);
      }
    },
    settle,
  };
};

export { useCollapsiblePanels };

export type { CollapsiblePanels };
