import type { DragSubject, DropIntent } from "@dashfoo/core";
import { describe, expect, test } from "vitest";

import { sameDragSubject, sameDropIntent } from "./drag-hooks";

// The guard the adapter uses to keep OVER pulses (a fresh intent object per
// pointer move) from notifying store subscribers when the resolved drop hasn't
// actually changed.
describe("sameDropIntent", () => {
  const intent: DropIntent = { index: 2, location: "center", targetId: "ts-main" };

  test("matches two nulls and the same reference", () => {
    expect(sameDropIntent(null, null)).toBe(true);
    expect(sameDropIntent(intent, intent)).toBe(true);
  });

  test("matches value-equal intents across object identities", () => {
    expect(sameDropIntent(intent, { ...intent })).toBe(true);
    expect(
      sameDropIntent(
        { location: "split-left", targetId: "a" },
        { location: "split-left", targetId: "a" },
      ),
    ).toBe(true);
  });

  test("differs when either side is null", () => {
    expect(sameDropIntent(intent, null)).toBe(false);
    expect(sameDropIntent(null, intent)).toBe(false);
  });

  test("differs on targetId, location, or index", () => {
    expect(sameDropIntent(intent, { ...intent, targetId: "ts-side" })).toBe(false);
    expect(sameDropIntent(intent, { ...intent, location: "split-right" })).toBe(false);
    expect(sameDropIntent(intent, { ...intent, index: 3 })).toBe(false);
    expect(sameDropIntent(intent, { location: "center", targetId: "ts-main" })).toBe(false);
  });
});

// Layouts sharing a manager each build their own subject object for the same
// drag — the guard keeps the second adapter's write from notifying again.
describe("sameDragSubject", () => {
  const subject: DragSubject = { id: "tab-1", kind: "tab" };

  test("matches two nulls and value-equal subjects across identities", () => {
    expect(sameDragSubject(null, null)).toBe(true);
    expect(sameDragSubject(subject, { ...subject })).toBe(true);
  });

  test("differs on null, id, or kind", () => {
    expect(sameDragSubject(subject, null)).toBe(false);
    expect(sameDragSubject(null, subject)).toBe(false);
    expect(sameDragSubject(subject, { id: "tab-2", kind: "tab" })).toBe(false);
    expect(sameDragSubject(subject, { id: "tab-1", kind: "tabset" })).toBe(false);
  });
});
