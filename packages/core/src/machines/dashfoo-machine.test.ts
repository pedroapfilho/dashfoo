import { describe, expect, test } from "vitest";
import { createActor } from "xstate";

import { canRedo, canUndo } from "../history";
import type { Dashfoo, TabNode } from "../schema";

import { dashfooMachine } from "./dashfoo-machine";

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

const start = (initial: Dashfoo = model()) => {
  const actor = createActor(dashfooMachine, { input: { model: initial } });
  actor.start();
  return actor;
};

describe("dashfooMachine", () => {
  test("starts with the input model as the present document", () => {
    const actor = start();

    expect(actor.getSnapshot().context.history.present).toEqual(model());
  });

  test("DISPATCH applies an action and enables undo", () => {
    const actor = start();
    actor.send({ action: { tabsetId: "ts2", type: "setActiveTabset" }, type: "DISPATCH" });

    const { history } = actor.getSnapshot().context;
    expect(history.present.activeTabsetId).toBe("ts2");
    expect(canUndo(history)).toBe(true);
  });

  test("UNDO and REDO move through history", () => {
    const actor = start();
    actor.send({ action: { tabsetId: "ts2", type: "setActiveTabset" }, type: "DISPATCH" });

    actor.send({ type: "UNDO" });
    expect(actor.getSnapshot().context.history.present.activeTabsetId).toBe("ts1");
    expect(canRedo(actor.getSnapshot().context.history)).toBe(true);

    actor.send({ type: "REDO" });
    expect(actor.getSnapshot().context.history.present.activeTabsetId).toBe("ts2");
  });

  test("SET_MODEL replaces the document and resets history", () => {
    const actor = start();
    actor.send({ action: { tabsetId: "ts2", type: "setActiveTabset" }, type: "DISPATCH" });

    const replacement = model();
    replacement.activeTabsetId = "ts2";
    actor.send({ model: replacement, type: "SET_MODEL" });

    expect(actor.getSnapshot().context.history.present.activeTabsetId).toBe("ts2");
    expect(canUndo(actor.getSnapshot().context.history)).toBe(false);
  });
});
