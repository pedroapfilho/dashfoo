"use client";

import type { RowNode, TabsetNode } from "@dashfoo/core";
import { canCollapseTabset } from "@dashfoo/core";
import type { RefObject } from "react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type {
  GroupImperativeHandle,
  PanelImperativeHandle,
  PanelProps,
} from "react-resizable-panels";

import type { FitBudget } from "./collapse-geometry";
import {
  addToBudget,
  collapseUntilFit,
  expandToMinimum,
  expandWhereRoom,
  keepCollapsedWeights,
  measureHeader,
  sameSet,
  sharesOf,
  spaceForPanels,
} from "./collapse-geometry";
import { useLayout } from "./layout-store";
import type { TabsetSlot } from "./tabset-slot";

type LayoutChild = RowNode["children"][number];

/** Strip thickness in pixels, by the id of each collapsible child. */
type HeaderSizes = ReadonlyMap<string, number>;

type CollapsiblePanelsOptions = {
  minPixels: (child: LayoutChild) => number | undefined;
  node: RowNode;
  panelIdOf: (childId: string) => string;
};

type CollapsePanelProps = Pick<
  PanelProps,
  "collapsedSize" | "collapsible" | "elementRef" | "panelRef"
>;

type CollapsiblePanels = {
  /** Shown collapsed: collapsed in the model, or collapsed to fit. */
  collapsedIds: ReadonlySet<string>;
  groupRef: RefObject<GroupImperativeHandle | null>;
  panelProps: (child: LayoutChild) => CollapsePanelProps;
  setGroupElement: (element: HTMLDivElement | null) => void;
  /** Turns a user resize into one action: a collapse or expand when the drag crossed a minimum, else new weights. */
  settle: (sizes: Array<number>) => void;
  slotFor: (child: TabsetNode, alone: boolean) => TabsetSlot;
};

const EMPTY: ReadonlySet<string> = new Set();

/**
 * Keeps the group's collapsed panels in step with the model, and collapses panels to
 * fit a split too small for its minimums without touching the model.
 */
const useCollapsiblePanels = ({
  minPixels,
  node,
  panelIdOf,
}: CollapsiblePanelsOptions): CollapsiblePanels => {
  const dispatch = useLayout((state) => state.dispatch);
  const [groupElement, setGroupElement] = useState<HTMLDivElement | null>(null);
  const groupRef = useRef<GroupImperativeHandle | null>(null);
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

  /** How much the children need against what the split gives them, and who may collapse. */
  const measureFit = (available: number): FitBudget => {
    const budget: FitBudget = { available, candidates: [], expandedCount: 0, required: 0 };

    for (const child of node.children) {
      const collapsible = isCollapsible(child);

      addToBudget(budget, {
        eligible: collapsible && child.collapsed !== true,
        handle: collapsible ? handles.current.get(child.id) : undefined,
        header: headerSizes.get(child.id),
        id: child.id,
        minimum: minPixels(child) ?? 0,
      });
    }

    return budget;
  };

  /**
   * The group lets panels shrink below their minimums when the container does, so
   * collapsible children collapse, last first, until the minimums fit, and
   * expand again, first first, once there is room.
   */
  const collapseToFit = (targets: Set<string>): void => {
    if (groupElement) {
      const budget = measureFit(spaceForPanels(groupElement, node.orientation));
      expandWhereRoom(budget);
      collapseUntilFit(budget, targets);
    }
  };

  /**
   * The group refuses `collapse()` while its layout breaks the minimums (a saved
   * layout that never fit), so the whole layout is set instead, with the
   * collapsed panels at their strip size.
   */
  const forceCollapsed = (targets: ReadonlySet<string>): void => {
    const group = groupRef.current;

    if (!group || !groupElement) {
      return;
    }

    const available = spaceForPanels(groupElement, node.orientation);

    const shares = sharesOf(
      node.children.map((child) => ({
        fixed: targets.has(child.id)
          ? ((headerSizes.get(child.id) ?? 0) / available) * 100
          : undefined,
        weight: child.weight,
      })),
    );

    group.setLayout(
      Object.fromEntries(
        node.children.map((child, index) => [panelIdOf(child.id), shares[index] ?? 0]),
      ),
    );
  };

  /** A panel handle throws until its group has registered the panel. */
  const registered = (): boolean => {
    const layout = groupRef.current?.getLayout();

    return layout !== undefined && node.children.every((child) => panelIdOf(child.id) in layout);
  };

  const measureHeaders = (): HeaderSizes => {
    const sizes = new Map<string, number>();

    for (const child of node.children) {
      const element = elements.current.get(child.id);
      const vertical = node.orientation === "row" && collapsedIds.has(child.id);
      const size = isCollapsible(child) && element ? measureHeader(element, vertical) : undefined;

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
  // frame lets the group take in the new size first, or it refuses the resize.
  useEffect(() => {
    if (!groupElement || typeof ResizeObserver === "undefined") {
      return undefined;
    }

    let frame: number | undefined;

    const cancelFrame = (): void => {
      if (frame !== undefined) {
        cancelAnimationFrame(frame);
      }
    };

    const observer = new ResizeObserver(() => {
      cancelFrame();
      frame = requestAnimationFrame(() => {
        reconcileRef.current();
      });
    });

    observer.observe(groupElement);

    return () => {
      cancelFrame();
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

  const panelProps = (child: LayoutChild): CollapsePanelProps => {
    const collapsible = isCollapsible(child);
    const headerSize = headerSizes.get(child.id);

    return {
      collapsedSize: collapsible && headerSize !== undefined ? `${headerSize}px` : undefined,
      collapsible,
      elementRef: (element) => {
        if (element) {
          elements.current.set(child.id, element);
        } else {
          elements.current.delete(child.id);
        }
      },
      panelRef: (handle) => {
        if (handle) {
          handles.current.set(child.id, handle);
        } else {
          handles.current.delete(child.id);
        }
      },
    };
  };

  const slotFor = (child: TabsetNode, alone: boolean): TabsetSlot => ({
    alone,
    canCollapse: isCollapsible(child) && !collapsedIds.has(child.id),
    collapsed: collapsedIds.has(child.id),
    collapsedToFit: fitIds.has(child.id),
    orientation: node.orientation,
  });

  return { collapsedIds, groupRef, panelProps, setGroupElement, settle, slotFor };
};

export { useCollapsiblePanels };

export type { CollapsiblePanels };
