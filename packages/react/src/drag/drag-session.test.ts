import type { Action, DragSubject } from "@dashfoo/core";
import { dragDockMachine } from "@dashfoo/core/internal";
import { describe, expect, test, vi } from "vitest";
import { createActor } from "xstate";

import type { RegisteredLayer } from "./drag-context";
import { createDragSession } from "./drag-session";

const tab: DragSubject = { documentId: "doc", id: "t1", kind: "tab" };
const rect = { height: 10, width: 10, x: 0, y: 0 };

const target = (tabsetId: string) => ({
  element: document.createElement("div"),
  layerId: "main",
  point: { x: 1, y: 1 },
  tabsetId,
});

const mount = (tearOff: ReturnType<RegisteredLayer["tearOff"]> = null) => {
  const commit = vi.fn<(action: Action, subject: DragSubject) => void>();

  const layer: RegisteredLayer = {
    commit,
    documentId: () => "doc",
    floating: false,
    layerId: "main",
    resolveDrop: (_subject, tabsetId) =>
      tabsetId === "open"
        ? {
            indicator: { kind: "zone", rect },
            intent: { location: "center", targetId: tabsetId },
          }
        : null,
    tearOff: () => tearOff,
  };

  const actorRef = createActor(dragDockMachine).start();
  const session = createDragSession(actorRef, new Map([[layer.layerId, layer]]));
  session.listen();

  return { commit, session };
};

describe("drag session", () => {
  test("a drop commits to the layer that resolved it, and nothing drops where nothing resolved", () => {
    const { commit, session } = mount();

    session.start(tab, "own");
    expect(session.over(target("closed"))).toBe(false);
    expect(session.drop()).toBe(false);
    expect(commit).not.toHaveBeenCalled();

    session.start(tab, "own");
    expect(session.over(target("open"))).toBe(true);
    expect(session.drop()).toBe(true);
    expect(commit).toHaveBeenCalledWith(expect.objectContaining({ type: "moveNode" }), tab);
    expect(session.subject()).toBeNull();
  });

  test("starting again with the same subject keeps the drag, its drop and who started it", () => {
    const { session } = mount();

    session.start(tab, "own");
    session.over(target("open"));
    session.start({ ...tab });

    expect(session.startedHere()).toBe(true);
    expect(session.drop()).toBe(true);
  });

  test("a different subject replaces the drag, and an adopted one was not started here", () => {
    const { session } = mount();

    session.start(tab, "own");
    session.start({ ...tab, id: "t2" });

    expect(session.subject()).toMatchObject({ id: "t2" });
    expect(session.startedHere()).toBe(false);
  });

  test("tears off only outside the window, and only when the subject's layout takes tear-offs", () => {
    const handler = vi.fn<NonNullable<ReturnType<RegisteredLayer["tearOff"]>>>();
    const screen = { x: -5, y: 5 };

    expect(mount().session.tearOff(tab, null, { outside: true, screen })).toBeNull();
    expect(mount(handler).session.tearOff(tab, null, { outside: false, screen })).toBeNull();

    mount(handler).session.tearOff(tab, null, { outside: true, screen })?.();
    expect(handler).toHaveBeenCalledWith(tab, null, screen);
  });
});
