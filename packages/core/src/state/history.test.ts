import { describe, expect, test } from "vitest";

import type { Dashfoo, TabNode } from "../model/schema";

import {
  canRedoHistory,
  canUndoHistory,
  createHistory,
  dispatchToHistory,
  HISTORY_LIMIT,
  redoHistory,
  undoHistory,
} from "./history";

const tab = (id: string): TabNode => ({ component: "c", id, name: id, type: "tab" });

const model = (): Dashfoo => ({
  activeTabsetId: "ts1",
  floats: [],
  global: {},
  layout: {
    children: [
      { children: [tab("t1"), tab("t2")], id: "ts1", selected: 0, type: "tabset", weight: 60 },
      { children: [tab("t3")], id: "ts2", selected: 0, type: "tabset", weight: 40 },
    ],
    id: "root",
    orientation: "row",
    type: "row",
    weight: 1,
  },
  version: 1,
});

const weights = (state: Dashfoo): Array<number | undefined> =>
  state.layout.children.map((child) => child.weight);

describe("history", () => {
  test("a fresh history can neither undo nor redo", () => {
    const history = createHistory(model());

    expect(canUndoHistory(history)).toBe(false);
    expect(canRedoHistory(history)).toBe(false);
  });

  test("a fresh history holds the normalized document", () => {
    const raw = model();
    raw.activeTabsetId = "missing";

    expect(createHistory(raw).present.activeTabsetId).toBe("ts1");
  });

  test("undo restores the previous state", () => {
    let history = createHistory(model());
    history = dispatchToHistory(history, { index: 1, tabsetId: "ts1", type: "selectTab" });
    expect(history.present.layout.children[0]?.type === "tabset").toBe(true);

    history = undoHistory(history);

    expect(canUndoHistory(history)).toBe(false);
    expect(history.present.activeTabsetId).toBe("ts1");
  });

  test("redo reapplies an undone action", () => {
    let history = createHistory(model());
    history = dispatchToHistory(history, { tabsetId: "ts2", type: "setActiveTabset" });
    const afterDispatch = history.present;

    history = undoHistory(history);
    expect(canRedoHistory(history)).toBe(true);
    history = redoHistory(history);

    expect(history.present.activeTabsetId).toBe(afterDispatch.activeTabsetId);
  });

  test("two distinct actions are two undo steps", () => {
    let history = createHistory(model());
    history = dispatchToHistory(history, { index: 1, tabsetId: "ts1", type: "selectTab" });
    history = dispatchToHistory(history, { tabsetId: "ts2", type: "setActiveTabset" });

    history = undoHistory(history);
    expect(canUndoHistory(history)).toBe(true);
    history = undoHistory(history);
    expect(canUndoHistory(history)).toBe(false);
  });

  test("two successive resizes on the same row are two separate undo steps", () => {
    let history = createHistory(model());
    history = dispatchToHistory(history, { rowId: "root", type: "adjustSplit", weights: [70, 30] });
    history = dispatchToHistory(history, { rowId: "root", type: "adjustSplit", weights: [80, 20] });
    expect(weights(history.present)).toEqual([80, 20]);

    history = undoHistory(history);
    expect(weights(history.present)).toEqual([70, 30]);
    expect(canUndoHistory(history)).toBe(true);

    history = undoHistory(history);
    expect(weights(history.present)).toEqual([60, 40]);
    expect(canUndoHistory(history)).toBe(false);
  });

  test("dispatching after an undo clears the redo future", () => {
    let history = createHistory(model());
    history = dispatchToHistory(history, { tabsetId: "ts2", type: "setActiveTabset" });
    history = undoHistory(history);
    history = dispatchToHistory(history, { index: 1, tabsetId: "ts1", type: "selectTab" });

    expect(canRedoHistory(history)).toBe(false);
  });

  test("past is capped at HISTORY_LIMIT", () => {
    let history = createHistory(model());
    for (let i = 0; i < HISTORY_LIMIT + 10; i++) {
      history = dispatchToHistory(history, { name: `tab-${i}`, tabId: "t1", type: "renameTab" });
    }

    expect(history.past.length).toBe(HISTORY_LIMIT);
  });

  test("oldest steps are dropped, newest kept", () => {
    let history = createHistory(model());

    for (let i = 0; i < 10; i++) {
      history = dispatchToHistory(history, { name: `early-${i}`, tabId: "t1", type: "renameTab" });
    }

    const stateAfterTenth = history.present;
    for (let i = 0; i < HISTORY_LIMIT; i++) {
      history = dispatchToHistory(history, { name: `late-${i}`, tabId: "t1", type: "renameTab" });
    }

    for (let i = 0; i < HISTORY_LIMIT; i++) {
      history = undoHistory(history);
    }

    expect(history.present).toEqual(stateAfterTenth);
    expect(canUndoHistory(history)).toBe(false);
  });

  test("an action that changes nothing records no undo step", () => {
    const history = dispatchToHistory(createHistory(model()), {
      index: 0,
      tabsetId: "ts1",
      type: "selectTab",
    });

    expect(history.past).toHaveLength(0);
    expect(canUndoHistory(history)).toBe(false);
  });

  test("an action that changes nothing preserves the redo stack", () => {
    let history = createHistory(model());
    history = dispatchToHistory(history, { name: "renamed", tabId: "t1", type: "renameTab" });
    history = undoHistory(history);
    expect(canRedoHistory(history)).toBe(true);

    history = dispatchToHistory(history, { index: 0, tabsetId: "ts1", type: "selectTab" });

    expect(canRedoHistory(history)).toBe(true);
  });

  test("redo respects the cap", () => {
    let history = createHistory(model());
    for (let i = 0; i < HISTORY_LIMIT; i++) {
      history = dispatchToHistory(history, { name: `step-${i}`, tabId: "t1", type: "renameTab" });
    }
    const preUndoPresent = history.present;

    history = undoHistory(history);
    history = redoHistory(history);

    expect(history.past.length).toBe(HISTORY_LIMIT);
    expect(history.present).toEqual(preUndoPresent);
  });
});
