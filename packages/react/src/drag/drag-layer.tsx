"use client";

import type { Action, Dashfoo, DragSubject, MeasuredLayout, Point } from "@dashfoo/core";
import {
  collectTabsetsInRow,
  dropIndicator,
  resolveDropIntent,
  standaloneModel,
  warn,
  warnOnce,
} from "@dashfoo/core";
import type { ReactNode } from "react";
import { useContext, useEffect, useId, useMemo } from "react";

import { InsideFloatContext } from "../float/float-context";
import type { LayoutInternals, LayoutStore } from "../layout/layout-store";
import { LayoutStoreContext } from "../layout/layout-store";
import { closestPart, PART } from "../lib/parts";
import { measureRootRow, measureTabset } from "../tabset/measure-tabset";

import type { DragContextValue, RegisteredLayer } from "./drag-context";
import { DragContext } from "./drag-context";
import type { InternalSubject } from "./drag-group";
import { canExchange, collides, sourceDocument } from "./drag-group";
import type { TearOffRequest } from "./tear-off";

type DragLayerProps = { children: ReactNode };

const isForeign = (state: LayoutInternals, subject: DragSubject): subject is InternalSubject =>
  subject.kind !== "external" && subject.documentId !== state.documentId;

/** A foreign node is acceptable from a source in the same drag group, unless its tab ids are taken here. */
const canDrop = (state: LayoutInternals, subject: DragSubject): boolean => {
  if (!state.canDock) {
    return false;
  }

  if (!isForeign(state, subject)) {
    return true;
  }

  const source = sourceDocument(subject.documentId);

  if (!source || !canExchange({ group: state.dragGroup, scope: state.dragGroupScope }, source)) {
    return false;
  }

  const node = source.take(subject);

  return node === undefined || !collides(state.model, node);
};

/** A move whose source lives in another layout lands as a `transferIn` here and a `transferOut` there. */
const transfer = (state: LayoutInternals, action: Action, subject: InternalSubject): void => {
  if (action.type !== "moveNode" && action.type !== "moveTabset") {
    return;
  }

  const source = sourceDocument(subject.documentId);
  const node = source?.take(subject);

  if (!source || !node || collides(state.model, node)) {
    warn(`transfer of "${subject.id}" dropped: its source no longer offers it`);

    return;
  }

  state.dispatch({
    index: action.type === "moveNode" ? action.index : undefined,
    location: action.location,
    node,
    targetId: action.targetId,
    type: "transferIn",
  });
  source.release(subject);
};

const measuredSize = (element: Element | null): TearOffRequest["size"] => {
  const rect = element && closestPart(element, PART.tabset)?.getBoundingClientRect();

  return { height: rect?.height ?? 0, width: rect?.width ?? 0 };
};

type TearOff = (subject: InternalSubject, source: Element | null, screen: Point) => void;

/** `null` when the layout takes no tear-offs. */
const tearOffHandler = (store: LayoutStore): TearOff | null => {
  const { canDock, dispatch, onTearOff } = store.getState();

  if (!canDock || !onTearOff) {
    return null;
  }

  return (subject, source, screen) => {
    const detached = standaloneModel(store.getState().model, subject.id);

    if (
      detached &&
      onTearOff({
        kind: subject.kind,
        model: detached,
        nodeId: subject.id,
        point: screen,
        size: measuredSize(source),
      })
    ) {
      dispatch({ nodeId: subject.id, type: "tearOff" });
    }
  };
};

const measureEdges = ({ layout }: Dashfoo, element: HTMLElement): MeasuredLayout | undefined => {
  const rect = measureRootRow(element);

  return rect
    ? { id: layout.id, rect, tabsetCount: collectTabsetsInRow(layout).length }
    : undefined;
};

const createLayer = (layerId: string, store: LayoutStore, floating = false): RegisteredLayer => ({
  commit: (action, subject) => {
    const state = store.getState();

    if (!canDrop(state, subject)) {
      return;
    }

    if (isForeign(state, subject)) {
      transfer(state, action, subject);
    } else {
      state.dispatch(action);
    }
  },
  documentId: () => store.getState().documentId,
  floating,
  layerId,
  resolveDrop: (subject, tabsetId, element, point) => {
    const state = store.getState();

    if (!canDrop(state, subject)) {
      return null;
    }

    const tabset = measureTabset(tabsetId, element);

    const options = {
      edges: state.edgeDocking ? measureEdges(state.model, element) : undefined,
      foreign: isForeign(state, subject),
      splitDock: state.splitDock && tabsetId !== state.model.layout.id,
    };

    const intent = resolveDropIntent(subject, tabset, point, options);

    return intent && { indicator: dropIndicator(subject, tabset, intent, options), intent };
  },
  tearOff: () => tearOffHandler(store),
});

/** One drag layer: the main tree, or one float. Holds no drag state of its own. */
const DragLayer = ({ children }: DragLayerProps): ReactNode => {
  const root = useContext(DragContext);
  const store = useContext(LayoutStoreContext);
  const layerId = useId();
  const floating = useContext(InsideFloatContext);

  const registerLayer = root?.registerLayer;
  useEffect(() => {
    if (!registerLayer || !store) {
      warnOnce(
        "drag-layer-no-root",
        "Layout.DragLayer is not inside a <Layout.Root>; its tabsets cannot be dragged or dropped on",
      );

      return undefined;
    }

    return registerLayer(createLayer(layerId, store, floating));
  }, [floating, layerId, registerLayer, store]);

  const layer = useMemo<DragContextValue | null>(
    () => (root === null || store === null ? null : { ...root, layerId }),
    [layerId, root, store],
  );

  if (layer === null) {
    return children;
  }

  return <DragContext.Provider value={layer}>{children}</DragContext.Provider>;
};

export { createLayer, DragLayer };

export type { DragLayerProps };
