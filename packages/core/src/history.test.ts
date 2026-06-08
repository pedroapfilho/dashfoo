import { describe, expect, test } from "vitest";

import { canRedo, canUndo, createHistory, dispatch, redo, undo } from "./history";
import type { Dashfoo, TabNode } from "./schema";

const tab = (id: string): TabNode => ({ component: "c", id, name: id, type: "tab" });

const model = (): Dashfoo => ({
  activeTabsetId: "ts1",
  global: {},
  layout: {
    children: [
      { children: [tab("t1"), tab("t2")], id: "ts1", selected: 0, type: "tabset", weight: 60 },
      { children: [tab("t3")], id: "ts2", selected: 0, type: "tabset", weight: 40 },
    ],
    id: "root",
    orientation: "row",
    type: "row",
  },
  version: 1,
});

const weights = (state: Dashfoo): Array<number | undefined> =>
  state.layout.children.map((child) => child.weight);

describe("history", () => {
  test("a fresh history can neither undo nor redo", () => {
    const history = createHistory(model());

    expect(canUndo(history)).toBe(false);
    expect(canRedo(history)).toBe(false);
  });

  test("undo restores the previous state", () => {
    let history = createHistory(model());
    history = dispatch(history, { index: 1, tabsetId: "ts1", type: "selectTab" });
    expect(history.present.layout.children[0]?.type === "tabset").toBe(true);

    history = undo(history);

    expect(canUndo(history)).toBe(false);
    expect(history.present.activeTabsetId).toBe("ts1");
  });

  test("redo reapplies an undone action", () => {
    let history = createHistory(model());
    history = dispatch(history, { tabsetId: "ts2", type: "setActiveTabset" });
    const afterDispatch = history.present;

    history = undo(history);
    expect(canRedo(history)).toBe(true);
    history = redo(history);

    expect(history.present.activeTabsetId).toBe(afterDispatch.activeTabsetId);
  });

  test("two distinct actions are two undo steps", () => {
    let history = createHistory(model());
    history = dispatch(history, { index: 1, tabsetId: "ts1", type: "selectTab" });
    history = dispatch(history, { tabsetId: "ts2", type: "setActiveTabset" });

    history = undo(history);
    expect(canUndo(history)).toBe(true);
    history = undo(history);
    expect(canUndo(history)).toBe(false);
  });

  test("two successive resizes on the same row are two separate undo steps", () => {
    let history = createHistory(model());
    history = dispatch(history, { rowId: "root", type: "adjustSplit", weights: [70, 30] });
    history = dispatch(history, { rowId: "root", type: "adjustSplit", weights: [80, 20] });
    expect(weights(history.present)).toEqual([80, 20]);

    history = undo(history);
    expect(weights(history.present)).toEqual([70, 30]);
    expect(canUndo(history)).toBe(true);

    history = undo(history);
    expect(weights(history.present)).toEqual([60, 40]);
    expect(canUndo(history)).toBe(false);
  });

  test("dispatching after an undo clears the redo future", () => {
    let history = createHistory(model());
    history = dispatch(history, { tabsetId: "ts2", type: "setActiveTabset" });
    history = undo(history);
    history = dispatch(history, { index: 1, tabsetId: "ts1", type: "selectTab" });

    expect(canRedo(history)).toBe(false);
  });
});
