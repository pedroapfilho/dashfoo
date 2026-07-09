import { CollisionPriority, CollisionType } from "@dnd-kit/abstract";
import { describe, expect, test, vi } from "vitest";

import type { TopmostDetectorInput } from "./topmost-collision";
import { createTopmostPointerIntersection } from "./topmost-collision";

const inputFor = (
  droppable: TopmostDetectorInput["droppable"],
  x = 10,
  y = 10,
): TopmostDetectorInput => ({ dragOperation: { position: { current: { x, y } } }, droppable });

const tabsetElement = (): { child: HTMLElement; element: HTMLElement } => {
  const element = document.createElement("div");
  const child = document.createElement("button");
  element.append(child);
  document.body.append(element);
  return { child, element };
};

describe("createTopmostPointerIntersection", () => {
  test("the droppable containing the topmost element wins as a pointer intersection", () => {
    const { child, element } = tabsetElement();
    const detect = createTopmostPointerIntersection(() => child);

    const collision = detect(inputFor({ element, id: "ts1" }));

    expect(collision).not.toBeNull();
    expect(collision!.id).toBe("ts1");
    expect(collision!.type).toBe(CollisionType.PointerIntersection);
    expect(collision!.priority).toBe(CollisionPriority.High);
  });

  test("an occluded droppable returns null even when its rect would contain the point", () => {
    const docked = tabsetElement();
    const float = tabsetElement();
    const detect = createTopmostPointerIntersection(() => float.child);

    expect(detect(inputFor({ element: docked.element, id: "docked" }))).toBeNull();
    expect(detect(inputFor({ element: float.element, id: "float" }))?.id).toBe("float");
  });

  test("no topmost element (pointer outside the document) hits nothing", () => {
    const { element } = tabsetElement();
    const detect = createTopmostPointerIntersection(() => null);

    expect(detect(inputFor({ element, id: "ts1" }))).toBeNull();
  });

  test("a droppable without an element can't be hit", () => {
    const detect = createTopmostPointerIntersection(() => document.body);

    expect(detect(inputFor({ id: "detached" }))).toBeNull();
  });

  test("nested droppables both hit, and the innermost wins on value", () => {
    const outer = document.createElement("div");
    const inner = document.createElement("div");
    const leaf = document.createElement("span");
    inner.append(leaf);
    outer.append(inner);
    document.body.append(outer);
    const detect = createTopmostPointerIntersection(() => leaf);

    const outerHit = detect(inputFor({ element: outer, id: "outer" }));
    const innerHit = detect(inputFor({ element: inner, id: "inner" }));

    expect(outerHit).not.toBeNull();
    expect(innerHit).not.toBeNull();

    expect(innerHit!.value).toBeGreaterThan(outerHit!.value);
  });

  test("one topmost lookup serves a whole synchronous collision pass", async () => {
    const { child, element } = tabsetElement();
    const other = tabsetElement();
    const topElementAt = vi.fn(() => child);
    const detect = createTopmostPointerIntersection(topElementAt);

    detect(inputFor({ element, id: "a" }));
    detect(inputFor({ element: other.element, id: "b" }));
    expect(topElementAt).toHaveBeenCalledTimes(1);

    await Promise.resolve();
    detect(inputFor({ element, id: "a" }));
    expect(topElementAt).toHaveBeenCalledTimes(2);
  });
});
