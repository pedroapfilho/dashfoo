"use client";

import type { DragSubject, DropIntent, TabNode } from "@dashfoo/core";
import {
  Accessibility,
  Draggable,
  DragDropManager,
  Droppable,
  Feedback,
  PointerSensor,
} from "@dnd-kit/dom";
import type { Context } from "react";
import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef } from "react";
import type { StoreApi } from "zustand";
import { createStore, useStore } from "zustand";

import { topmostPointerIntersection } from "../lib/topmost-collision";

// Shared drag contexts + the draggable/droppable hooks. Lives apart from
// drag-adapter.tsx so the contexts can be owned here without a circular import:
// drag-adapter imports these for DragProvider and re-exports the hooks, and this
// module never reaches back into drag-adapter.

const INTERACTIVE_SELECTOR = `
  input:not([disabled]),
  select:not([disabled]),
  textarea:not([disabled]),
  button:not([disabled]),
  a[href],
  [contenteditable]:not([contenteditable="false"])
`;

// The sensor's default preventActivation vetoes any pointerdown whose target is
// an element child of the draggable: closest() walks up to the trigger button
// itself and calls it "interactive". Plain-text labels dodge that (text nodes
// are not elements), but custom labels render elements inside the trigger and
// would silently lose dragging. Allow the draggable itself as the handle while
// still refusing genuinely interactive children nested in a label.
const preventActivation = (event: PointerEvent, source: Draggable): boolean => {
  const { target } = event;
  if (!(target instanceof Element)) {
    return false;
  }
  const interactive = target.closest(INTERACTIVE_SELECTOR);
  return interactive !== null && interactive !== source.element;
};

// Plugins drop the screen-reader announcer (it stamps ARIA that is invalid on
// role=tab) and reconfigure Feedback: it runs in overlay mode only — the chip
// element is handed to its public `overlay` accessor (see DragPreviewOverlay),
// so the source element is never promoted or placeholder-cloned — with the drop
// animation off, since drops must settle immediately and new drags are ignored
// while one animates. Sensors keep only a configured PointerSensor — the
// KeyboardSensor's nudge model double-binds the arrow keys the tab strip
// already uses for roving-tabindex navigation, so keyboard docking needs its
// own interaction design rather than that sensor.
const createDragManager = (): DragDropManager =>
  new DragDropManager({
    plugins: (defaults) => [
      ...defaults.filter((plugin) => plugin !== Accessibility && plugin !== Feedback),
      Feedback.configure({ dropAnimation: null }),
    ],
    sensors: () => [PointerSensor.configure({ preventActivation })],
  });

type DragContextValue = {
  // Identifies the owning DragProvider: droppables carry it in `data` so each
  // layer can claim only its own targets from the manager-global winner.
  layerId: string;
  manager: DragDropManager;
};

const DragContext = createContext<DragContextValue | null>(null);

// A manager owned by DashfooDragProvider, shared between a layout and external
// tab sources outside it so drags can cross that boundary. The annotation keeps
// declaration emit from expanding @dnd-kit's non-exported generic defaults.
const SharedDragManagerContext: Context<DragDropManager | null> =
  createContext<DragDropManager | null>(null);

// The live drag subject and drop intent ride a scoped zustand store instead of a
// context value, so a drag start/end re-renders only the parts that select the
// subject — never the provider subtree. The store is owned by the nearest
// DashfooDragProvider when one exists (so anything under it, layout or not, can
// observe drags) and by the DragLayer otherwise; the dragDockMachine
// subscription feeds it. Intent updates are value-guarded by the adapter
// (sameDropIntent) so OVER pulses only notify when the resolved drop changes.
// intentOwner disambiguates layouts sharing one store: each layer claims only
// its own droppables from the manager-global winner, so a null intent from one
// layer must not erase the live intent the owning layer resolved — the write
// order between layers on a winner handoff is unspecified.
type DragSubjectState = {
  intent: DropIntent | null;
  intentOwner: string | null;
  subject: DragSubject | null;
};

type DragSubjectStore = StoreApi<DragSubjectState>;

const createDragSubjectStore = (): DragSubjectStore =>
  createStore<DragSubjectState>(() => ({ intent: null, intentOwner: null, subject: null }));

// Whether two intents resolve the same drop. Intents are rebuilt on every
// pointer move, so identity alone would notify subscribers on each pulse.
const sameDropIntent = (a: DropIntent | null, b: DropIntent | null): boolean =>
  a === b ||
  (a !== null &&
    b !== null &&
    a.index === b.index &&
    a.location === b.location &&
    a.targetId === b.targetId);

// Whether two subjects describe the same drag. Layouts sharing a manager each
// build their own subject object for the same drag, so identity alone would
// write twice per drag start.
const sameDragSubject = (a: DragSubject | null, b: DragSubject | null): boolean =>
  a === b || (a !== null && b !== null && a.id === b.id && a.kind === b.kind);

// Stable empty store so useDragSubject keeps an unconditional hook order (and
// returns null) outside a DragLayer — parts must keep working drag-free.
const nullSubjectStore = createDragSubjectStore();

const DragSubjectStoreContext: Context<DragSubjectStore | null> =
  createContext<DragSubjectStore | null>(null);

// Tracks a Draggable's element across renders without rebuilding it. Returned by
// the draggable hooks; their effects own the Draggable's lifecycle.
type DraggableHandle = {
  draggableRef: { current: Draggable | null };
  elementRef: { current: Element | null };
  ref: (element: Element | null) => void;
};

const useDraggableHandle = (): DraggableHandle => {
  const elementRef = useRef<Element | null>(null);
  const draggableRef = useRef<Draggable | null>(null);
  const ref = useCallback((element: Element | null): void => {
    elementRef.current = element;
    if (draggableRef.current) {
      draggableRef.current.element = element ?? undefined;
    }
  }, []);
  return { draggableRef, elementRef, ref };
};

// What a draggable carries: the dnd-kit id and the stable data (drag kind +
// tabset id), both derived from identity. The chip label is passed separately so
// it never sits in the construction effect's deps. data must be referentially
// stable (the wrappers memoize it) so the construction effect tracks it without
// rebuilding on every render.
type DraggableDescriptor = { data: Record<string, unknown>; id: string };

// Owns the full Draggable lifecycle shared by the tab and tabset hooks. The
// construction effect is keyed on identity only (manager, id, disabled, the
// stable data) — never on the chip label — so a tab click or rename can't tear
// down and rebuild the live instance. The label is folded into the live data by
// a separate effect, since data is only read at drag start; both effects fire in
// the same mount commit, so the label is current well before any pointer drag.
// `Draggable.data` is a public accessor in @dnd-kit/abstract, so the in-place
// update is type-safe.
const useDraggableEntity = (
  descriptor: DraggableDescriptor,
  disabled: boolean,
  label: string,
): { ref: (element: Element | null) => void } => {
  const context = useContext(DragContext);
  // Internal draggables (tabs, grips) live under DragProvider; external tab
  // sources sit outside it and reach the manager via DashfooDragProvider.
  const sharedManager = useContext(SharedDragManagerContext);
  const manager = context?.manager ?? sharedManager;
  const { draggableRef, elementRef, ref } = useDraggableHandle();
  const { data, id } = descriptor;

  useEffect(() => {
    if (!manager || disabled) {
      return undefined;
    }
    const draggable = new Draggable({ data: { ...data, label: "" }, id }, manager);
    draggable.element = elementRef.current ?? undefined;
    draggableRef.current = draggable;
    return () => {
      draggable.destroy();
      draggableRef.current = null;
    };
  }, [data, disabled, draggableRef, elementRef, id, manager]);

  useEffect(() => {
    const draggable = draggableRef.current;
    if (draggable) {
      draggable.data = { ...data, label };
    }
  }, [data, draggableRef, label]);

  return { ref };
};

const useTabDraggable = (
  tabId: string,
  disabled = false,
  label = "",
): { ref: (element: Element | null) => void } => {
  const data = useMemo(() => ({ type: "tab" }), []);
  return useDraggableEntity({ data, id: tabId }, disabled, label);
};

// The whole tabset is draggable from its grip. A distinct dnd-kit id (grip-*)
// avoids colliding with the tabset's own registered id; the real tabset id rides
// in `data` and becomes the moveTabset subject. The label feeds the overlay chip.
const useTabsetDraggable = (
  tabsetId: string,
  disabled = false,
  label = "",
): { ref: (element: Element | null) => void } => {
  const data = useMemo(() => ({ tabsetId, type: "tabset" }), [tabsetId]);
  return useDraggableEntity({ data, id: `grip-${tabsetId}` }, disabled, label);
};

// Registers the tabset as a dnd-kit Droppable with the occlusion-aware
// detector, mirroring useDraggableEntity's lifecycle: the effect is keyed on
// identity, the ref setter keeps `element` current across renders. Droppables
// register on the manager (shared across layers), so the winning tabset is
// resolved globally; `data.layerId` lets the owning DragProvider claim it.
const useTabsetDroppable = (tabsetId: string): { ref: (element: HTMLElement | null) => void } => {
  const context = useContext(DragContext);
  const elementRef = useRef<HTMLElement | null>(null);
  const droppableRef = useRef<Droppable | null>(null);
  const ref = useCallback((element: HTMLElement | null): void => {
    elementRef.current = element;
    if (droppableRef.current) {
      droppableRef.current.element = element ?? undefined;
    }
  }, []);
  const layerId = context?.layerId;
  const manager = context?.manager;

  useEffect(() => {
    if (!manager || layerId === undefined) {
      return undefined;
    }
    // Droppable ids must be manager-unique, but model tabset ids are only
    // unique within one layout — sibling layouts under a shared provider can
    // both have a "ts1", and dnd-kit's registry replaces the earlier entry on
    // an id collision. The layer prefix keeps registrations distinct; the
    // model id the adapter and reducer understand rides in data.
    const droppable = new Droppable(
      {
        collisionDetector: topmostPointerIntersection,
        data: { layerId, tabsetId, type: "tabset" },
        id: `${layerId}:${tabsetId}`,
      },
      manager,
    );
    droppable.element = elementRef.current ?? undefined;
    droppableRef.current = droppable;
    return () => {
      droppable.destroy();
      droppableRef.current = null;
    };
  }, [layerId, manager, tabsetId]);

  return { ref };
};

type ExternalTabSourceOptions = {
  // Must return a fresh TabNode (unique id) per call — each drop inserts a new
  // tab, and duplicate ids would fail the model's invariants.
  createTab: () => TabNode;
  disabled?: boolean;
  label?: string;
};

// Makes any element outside a layout a drag source that inserts a new tab when
// dropped on a DashfooLayout under the same DashfooDragProvider. The adapter
// recognizes the { type: "external" } payload and commits an addNode instead of
// a move. The ref-indirection keeps `data` referentially stable (the
// construction effect tracks it) while drags always call the latest createTab.
const useExternalTabSource = ({
  createTab,
  disabled = false,
  label = "",
}: ExternalTabSourceOptions): { ref: (element: Element | null) => void } => {
  const id = useId();
  const createTabRef = useRef(createTab);
  // Dependency-less on purpose: a plain ref sync so drags always call the latest createTab.
  useEffect(() => {
    createTabRef.current = createTab;
  });
  const data = useMemo(
    () => ({ createTab: (): TabNode => createTabRef.current(), type: "external" }),
    [],
  );
  return useDraggableEntity({ data, id: `external-${id}` }, disabled, label);
};

const useDragSubject = (): DragSubject | null => {
  const store = useContext(DragSubjectStoreContext);
  return useStore(store ?? nullSubjectStore, (state) => state.subject);
};

// The live drop intent: where the drag would land if dropped right now, null
// when nothing is dragging or the pointer is over no valid target (a no-op
// drop, a non-editable layout, or empty space). Lets consumers render their own
// drop indicators alongside the built-in one.
const useDropIntent = (): DropIntent | null => {
  const store = useContext(DragSubjectStoreContext);
  return useStore(store ?? nullSubjectStore, (state) => state.intent);
};

export type { DragContextValue, DragSubjectStore, ExternalTabSourceOptions };
export {
  createDragManager,
  createDragSubjectStore,
  DragContext,
  DragSubjectStoreContext,
  sameDragSubject,
  sameDropIntent,
  SharedDragManagerContext,
  useDragSubject,
  useDropIntent,
  useExternalTabSource,
  useTabDraggable,
  useTabsetDraggable,
  useTabsetDroppable,
};
