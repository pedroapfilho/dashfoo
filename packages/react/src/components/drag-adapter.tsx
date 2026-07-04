"use client";

import type { Action, DockLocation, DragSubject, DropIntent, Point } from "@dashfoo/core";
import { dragDockMachine, resolveDockTarget, tabNodeSchema } from "@dashfoo/core";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/dom";
import { useActorRef } from "@xstate/react";
import type { ReactNode } from "react";
import {
  useCallback,
  useContext,
  useEffect,
  useId,
  useInsertionEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { DragContextValue } from "../hooks/drag-hooks";
import {
  createDragManager,
  createDragSubjectStore,
  DragContext,
  DragSubjectStoreContext,
  sameDragSubject,
  sameDropIntent,
  SharedDragManagerContext,
} from "../hooks/drag-hooks";
import { LayoutStoreContext } from "../hooks/layout-store";
import { insertionIndex, pointInRect, shouldAllowDrop } from "../lib/tab-insertion";
import { warnOnce } from "../lib/warn-once";

import { DockIndicator, DragPreviewOverlay } from "./drag-overlays";

// This module is the drag adapter: it (with ./drag-hooks) is where @dnd-kit is
// touched. It wires the framework-agnostic @dnd-kit/dom core (no React bindings)
// to the already unit-tested dragDockMachine — the PointerSensor supplies
// activation + a live pointer, dnd-kit's collision pass resolves the tabset
// droppable under it (each with dashfoo's occlusion-aware detector, see
// ../lib/topmost-collision.ts), the adapter turns that target into a DropIntent,
// and the machine owns the lifecycle and emits a moveNode COMMIT forwarded via
// onCommit. The drag-preview chip rides the Feedback plugin's `overlay`
// accessor (see DragPreviewOverlay): the source element is never promoted or
// placeholder-cloned, and Feedback owns the chip's per-move positioning.

// The dragged tab is excluded so its own slot never counts toward the order —
// the insertion index and line are measured against the tabs it will land among.
const tabRects = (strip: Element, excludeId?: string): Array<DOMRect> =>
  [...strip.querySelectorAll<HTMLElement>('[data-dashfoo="tab"]')].flatMap((tab) =>
    tab.dataset.tabId === excludeId ? [] : [tab.getBoundingClientRect()],
  );

// The tab strip is always a "stack as a tab" target, with an insertion index that
// places the tab at a specific slot. Only the content area below it resolves to
// the center/split zones via resolveDockTarget (content center appends). The
// adapter gathers rects from the DOM; the pure math lives in ./tab-insertion.
const intentForTabset = (
  id: string,
  element: HTMLElement,
  point: Point,
  draggedId?: string,
): DropIntent => {
  const strip = element.querySelector('[data-dashfoo="tabstrip"]');
  if (strip && pointInRect(point, strip.getBoundingClientRect())) {
    return {
      index: insertionIndex(tabRects(strip, draggedId), point.x),
      location: "center",
      targetId: id,
    };
  }
  const target = resolveDockTarget(point, element.getBoundingClientRect());
  const location: DockLocation = target.kind === "tab" ? "center" : `split-${target.edge}`;
  if (location === "center" && strip) {
    return { index: tabRects(strip, draggedId).length, location, targetId: id };
  }
  return { location, targetId: id };
};

const isTabFactory = (value: unknown): value is () => unknown => typeof value === "function";

// A tabset grip carries { tabsetId, type: "tabset" }; an external source
// (useExternalTabSource) carries { createTab, type: "external" } and its tab is
// built and validated at drag start; a plain tab carries its id. null aborts
// the drag — the machine stays idle, so the following OVER/DROP are ignored.
const subjectFor = (source: {
  data?: Record<string, unknown>;
  id: string | number;
}): DragSubject | null => {
  const data = source.data;
  if (data?.type === "tabset") {
    return { id: String(data.tabsetId), kind: "tabset" };
  }
  if (data?.type === "external") {
    if (!isTabFactory(data.createTab)) {
      // A wired-up source that can't produce a tab must not fail silently.
      // oxlint-disable-next-line no-console
      console.warn("[dashfoo] external drag source is missing its createTab function");
      return null;
    }
    let candidate: unknown;
    try {
      candidate = data.createTab();
    } catch (error) {
      // A consumer callback that throws must abort the drag, not break dragging.
      // oxlint-disable-next-line no-console
      console.warn("[dashfoo] external drag source createTab threw", error);
      return null;
    }
    const parsed = tabNodeSchema.safeParse(candidate);
    if (!parsed.success) {
      // oxlint-disable-next-line no-console
      console.warn("[dashfoo] external drag source returned an invalid tab", parsed.error);
      return null;
    }
    return { id: String(source.id), kind: "external", tab: parsed.data };
  }
  return { id: String(source.id), kind: "tab" };
};

type DragProviderProps = {
  children: ReactNode;
  // Defaults to the layout store's dispatch when rendered under Layout.Root.
  onCommit?: (action: Action) => void;
  // Defaults to the layout store's splitDock (model global), else true.
  splitDock?: boolean;
};

const DragProvider = ({ children, onCommit, splitDock }: DragProviderProps): ReactNode => {
  const actorRef = useActorRef(dragDockMachine);
  // Nullable read on purpose (not the throwing useLayout hook): the drag layer
  // also works standalone with an explicit onCommit, e.g. in tests.
  const layoutStore = useContext(LayoutStoreContext);

  // One manager for the whole layout — the shared one when a DashfooDragProvider
  // sits above (so external sources participate in this layout's drags), else
  // our own. useState lazily constructs it once; the destroy rides a
  // useInsertionEffect cleanup (not useEffect) so StrictMode's simulated unmount
  // doesn't tear down the live instance — the same pattern @dnd-kit/react uses
  // internally.
  const sharedManager = useContext(SharedDragManagerContext);
  const [ownManager] = useState(() => (sharedManager ? null : createDragManager()));
  useInsertionEffect(() => () => ownManager?.destroy(), [ownManager]);
  const manager = sharedManager ?? ownManager;
  if (manager === null) {
    // Only reachable when a DashfooDragProvider unmounts while its layout stays
    // mounted — surface the misuse instead of dragging against a dead manager.
    throw new Error(
      "[dashfoo] DashfooDragProvider unmounted while its layout is still mounted; keep the provider above the layout or remount the layout",
    );
  }

  // The drag subject store: fed by the machine subscription, read by parts via
  // useDragSubject/useDropIntent selectors. Inherited from DashfooDragProvider
  // when one sits above (so consumers outside the layout can observe drags),
  // else owned here. Guarded so OVER pulses (every pointer move) don't notify
  // subscribers — only a subject change (drag start/end) or a value-level
  // intent change (the resolved drop moved) does. ownerId scopes intent writes:
  // layers sharing a store each claim only their own droppables from the
  // manager-global winner, so this layer's null must not erase an intent the
  // owning layer resolved.
  const inheritedStore = useContext(DragSubjectStoreContext);
  const [subjectStore] = useState(() => inheritedStore ?? createDragSubjectStore());
  const ownerId = useId();
  useEffect(() => {
    const subscription = actorRef.subscribe((snapshot) => {
      const { intent, subject } = snapshot.context;
      const state = subjectStore.getState();
      if (intent !== null) {
        if (!sameDropIntent(state.intent, intent) || state.intentOwner !== ownerId) {
          subjectStore.setState({ intent, intentOwner: ownerId });
        }
      } else if (state.intent !== null && state.intentOwner === ownerId) {
        subjectStore.setState({ intent: null, intentOwner: null });
      }
      if (!sameDragSubject(subjectStore.getState().subject, subject)) {
        subjectStore.setState({ subject });
      }
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [actorRef, ownerId, subjectStore]);

  // Consumer-supplied inputs ride refs (the configRef pattern from
  // usePersistence) so the machine subscriptions below stay attached across
  // re-renders — an inline onCommit or a flipped splitDock must not tear down
  // and re-attach the listeners on a hot path.
  const onCommitRef = useRef(onCommit);
  const splitDockRef = useRef(splitDock);
  useEffect(() => {
    onCommitRef.current = onCommit;
    splitDockRef.current = splitDock;
  });

  // The DockIndicator's target lookup, against the manager-global droppable
  // registry (tabsets register there via useTabsetDroppable). The machine only
  // ever holds intents for this layer's own targets, so reconstructing this
  // layer's prefixed droppable id from the model tabset id is always right.
  const getTabsetElement = useCallback(
    (id: string): HTMLElement | undefined => {
      const element = manager.registry.droppables.get(`${ownerId}:${id}`)?.element;
      return element instanceof HTMLElement ? element : undefined;
    },
    [manager, ownerId],
  );

  useEffect(() => {
    const subscription = actorRef.on("COMMIT", (emitted) => {
      // Mirrors the resolveIntent gate: even a drag whose `editable` was
      // flipped off mid-flight cannot land a structural action.
      if (layoutStore?.getState().editable === false) {
        return;
      }
      const commit = onCommitRef.current ?? layoutStore?.getState().dispatch;
      if (!commit) {
        warnOnce(
          "drag-layer-no-commit",
          "Layout.DragLayer has neither an onCommit prop nor a <Layout.Root> above it; drops are ignored",
        );
        return;
      }
      commit(emitted.action);
    });
    return () => {
      subscription.unsubscribe();
    };
  }, [actorRef, layoutStore]);

  // The helpers live inside the effect (per the React docs' "move it into the
  // effect" guidance) so the monitor listeners attach once per manager instead
  // of re-subscribing whenever a render rebuilds a callback.
  useEffect(() => {
    // The dock intent for a pointer over a tabset, or null when the drop would
    // be a no-op: a tabset dragged onto itself, or the sole tab of a tabset
    // dropped back onto that same tabset. Otherwise the tabset resolves to
    // center/split.
    const resolveIntent = (
      targetId: string,
      element: HTMLElement,
      point: Point,
      draggedId?: string,
    ): DropIntent | null => {
      // A non-editable layout is never a drop target — no indicator, no intent.
      // Read at drag time (getState, not a subscription) like splitDock below,
      // so a runtime flip is honored without re-rendering the layer; this also
      // rejects external-source drops arriving via a shared manager.
      if (layoutStore?.getState().editable === false) {
        return null;
      }
      const tabIds = [...element.querySelectorAll<HTMLElement>('[data-dashfoo="tab"]')].map(
        (tab) => tab.dataset.tabId ?? "",
      );
      if (!shouldAllowDrop(draggedId, targetId, tabIds)) {
        return null;
      }
      const intent = intentForTabset(targetId, element, point, draggedId);
      // When splitting is disabled, a drop over the body stacks instead of
      // splits. Resolved at drag time (getState, not a subscription) so a model
      // global flip mid-session is honored without re-rendering the layer.
      const splitDockResolved = splitDockRef.current ?? layoutStore?.getState().splitDock ?? true;
      if (!splitDockResolved && intent.location.startsWith("split-")) {
        return { location: "center", targetId };
      }
      return intent;
    };

    const handleStart = (event: DragStartEvent): void => {
      const source = event.operation.source;
      if (!source) {
        return;
      }
      const subject = subjectFor(source);
      if (!subject) {
        // Abort the dnd-kit operation too: the machine stays idle either way,
        // but a live Feedback drag would keep promoting the source element for
        // a gesture dashfoo will never commit.
        manager.actions.stop({ canceled: true });
        return;
      }
      actorRef.send({ subject, type: "START" });
    };

    // Feeds the machine the drop target dnd-kit's collision pass resolved
    // (manager-global, across every layer sharing this manager), claiming it
    // only when this layer owns it — otherwise OVER null, which clears this
    // layer's indicator while the owning layer shows its own.
    const syncIntent = (): void => {
      const operation = manager.dragOperation;
      const point = operation.position.current;
      const target = operation.target;
      // The droppable id is layer-prefixed (model tabset ids are only unique
      // per layout); the model id the machine and reducer understand rides in
      // the droppable's data, alongside the layer claim.
      const data = target?.data as { layerId?: string; tabsetId?: string } | undefined;
      const tabsetId = data?.layerId === ownerId ? data.tabsetId : undefined;
      const element = tabsetId === undefined ? undefined : target?.element;
      const draggedId = operation.source ? String(operation.source.id) : undefined;
      actorRef.send({
        intent:
          tabsetId !== undefined && element instanceof HTMLElement
            ? resolveIntent(tabsetId, element, point, draggedId)
            : null,
        type: "OVER",
      });
    };

    // Both events on purpose: inside a dragmove listener the target lags one
    // move behind (collisions recompute in a microtask after the dispatch), so
    // the collision event keeps target flips fresh — but it can skip pulses
    // while sliding within one tabset (the detector's value is constant per
    // tabset), so dragmove keeps the insertion index tracking the pointer.
    const handleMove = (): void => syncIntent();
    const handleCollision = (): void => syncIntent();

    // Recompute from the final operation state, then set the intent and commit
    // in one synchronous pair — the drop uses the authoritative final target,
    // not whatever the last pulse happened to report.
    const handleEnd = (event: DragEndEvent): void => {
      if (event.canceled) {
        actorRef.send({ type: "CANCEL" });
        return;
      }
      syncIntent();
      actorRef.send({ type: "DROP" });
    };
    const offStart = manager.monitor.addEventListener("dragstart", handleStart);
    const offMove = manager.monitor.addEventListener("dragmove", handleMove);
    const offCollision = manager.monitor.addEventListener("collision", handleCollision);
    const offEnd = manager.monitor.addEventListener("dragend", handleEnd);
    return () => {
      offStart();
      offMove();
      offCollision();
      offEnd();
    };
  }, [actorRef, layoutStore, manager, ownerId]);

  const contextValue = useMemo<DragContextValue>(
    () => ({ layerId: ownerId, manager }),
    [manager, ownerId],
  );

  return (
    <DragContext.Provider value={contextValue}>
      <DragSubjectStoreContext.Provider value={subjectStore}>
        {children}
        <DockIndicator actorRef={actorRef} getTabsetElement={getTabsetElement} />
        {/* One chip per manager: under a DashfooDragProvider the provider owns
            it, so N layouts sharing that manager don't stack N chips. */}
        {ownManager === null ? null : <DragPreviewOverlay manager={ownManager} />}
      </DragSubjectStoreContext.Provider>
    </DragContext.Provider>
  );
};

// The draggable/droppable hooks and the drag contexts live in ./drag-hooks to
// keep this module under the size cap and avoid a circular import; re-exported
// here so consumers still import the whole drag surface from "./drag-adapter".
export {
  useDragSubject,
  useTabDraggable,
  useTabsetDraggable,
  useTabsetDroppable,
} from "../hooks/drag-hooks";
export { DragProvider, subjectFor };
export type { DragProviderProps };
