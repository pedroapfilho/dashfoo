import { describe, expect, test } from "vitest";
import { createActor } from "xstate";

import type { Action } from "../state/actions";

import { dragDockMachine } from "./drag-dock-machine";

const startDrag = () => {
  const actor = createActor(dragDockMachine);
  actor.start();
  const committed: Array<Action> = [];
  actor.on("COMMIT", (emitted) => {
    committed.push(emitted.action);
  });
  return { actor, committed };
};

describe("dragDockMachine", () => {
  test("idle until a drag starts", () => {
    const { actor } = startDrag();

    expect(actor.getSnapshot().value).toBe("idle");
  });

  test("a full drag over a target emits a moveNode commit on drop", () => {
    const { actor, committed } = startDrag();
    actor.send({ subject: { id: "t1", kind: "tab" }, type: "START" });
    expect(actor.getSnapshot().value).toBe("dragging");

    actor.send({ intent: { location: "split-right", targetId: "ts2" }, type: "OVER" });
    actor.send({ type: "DROP" });

    expect(committed).toEqual([
      { location: "split-right", sourceId: "t1", targetId: "ts2", type: "moveNode" },
    ]);
    expect(actor.getSnapshot().value).toBe("idle");
  });

  test("dropping with no valid target emits nothing", () => {
    const { actor, committed } = startDrag();
    actor.send({ subject: { id: "t1", kind: "tab" }, type: "START" });
    actor.send({ type: "DROP" });

    expect(committed).toEqual([]);
    expect(actor.getSnapshot().value).toBe("idle");
  });

  test("cancelling a drag emits nothing and returns to idle", () => {
    const { actor, committed } = startDrag();
    actor.send({ subject: { id: "t1", kind: "tab" }, type: "START" });
    actor.send({ intent: { location: "center", targetId: "ts2" }, type: "OVER" });
    actor.send({ type: "CANCEL" });

    expect(committed).toEqual([]);
    expect(actor.getSnapshot().value).toBe("idle");
  });

  test("forwards the drop index for tab reordering", () => {
    const { actor, committed } = startDrag();
    actor.send({ subject: { id: "t1", kind: "tab" }, type: "START" });
    actor.send({ intent: { index: 2, location: "center", targetId: "ts1" }, type: "OVER" });
    actor.send({ type: "DROP" });

    expect(committed[0]).toEqual({
      index: 2,
      location: "center",
      sourceId: "t1",
      targetId: "ts1",
      type: "moveNode",
    });
  });

  test("a tabset subject emits a moveTabset commit on drop", () => {
    const { actor, committed } = startDrag();
    actor.send({ subject: { id: "ts1", kind: "tabset" }, type: "START" });
    actor.send({ intent: { location: "center", targetId: "ts2" }, type: "OVER" });
    actor.send({ type: "DROP" });

    expect(committed[0]).toEqual({
      location: "center",
      sourceId: "ts1",
      targetId: "ts2",
      type: "moveTabset",
    });
  });
});
