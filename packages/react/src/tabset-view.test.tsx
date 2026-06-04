import { describe, expect, test } from "vitest";

import { fallbackSelectedIndex } from "./tab-selection";

describe("fallbackSelectedIndex", () => {
  test("removing the first tab falls forward to the next", () => {
    expect(fallbackSelectedIndex(3, 0)).toBe(1);
  });
  test("removing a middle tab falls forward to the next", () => {
    expect(fallbackSelectedIndex(3, 1)).toBe(2);
  });
  test("removing the last tab falls back to the previous", () => {
    expect(fallbackSelectedIndex(3, 2)).toBe(1);
  });
  test("removing the only tab yields -1 (no neighbour)", () => {
    expect(fallbackSelectedIndex(1, 0)).toBe(-1);
  });
});
