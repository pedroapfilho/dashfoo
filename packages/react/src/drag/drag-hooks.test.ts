import type { DropIntent } from "@dashfoo/core";
import { describe, expect, test } from "vitest";

import { sameDropIntent } from "./drag-hooks";

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
