import type { Dashfoo } from "@dashfoo/core";
import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";

import { activeBreakpoint, matchBreakpoint, useResponsiveModel } from "./responsive";

const model = (name: string): Dashfoo => ({
  activeTabsetId: "ts1",
  global: {},
  layout: {
    children: [
      {
        children: [{ component: "c", id: "t1", name, type: "tab" }],
        id: "ts1",
        selected: 0,
        type: "tabset",
      },
    ],
    id: "root",
    orientation: "row",
    type: "row",
  },
  version: 1,
});

const MOBILE = model("Mobile");
const DESKTOP = model("Desktop");

describe("matchBreakpoint", () => {
  test("a breakpoint with no query always matches", () => {
    expect(matchBreakpoint({ id: "d", model: DESKTOP }, 9999)).toBe(true);
  });

  test("a maxWidth query matches at or below the width", () => {
    const bp = { id: "m", model: MOBILE, query: { maxWidth: 640 } } as const;
    expect(matchBreakpoint(bp, 500)).toBe(true);
    expect(matchBreakpoint(bp, 800)).toBe(false);
  });

  describe("a media query consults matchMedia", () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    const bp = {
      id: "dark",
      model: MOBILE,
      query: { media: "(prefers-color-scheme: dark)" },
    } as const;

    test("returns true when the media query matches", () => {
      vi.stubGlobal(
        "matchMedia",
        vi.fn(() => ({ matches: true })),
      );
      expect(matchBreakpoint(bp, 0)).toBe(true);
    });

    test("returns false when the media query does not match", () => {
      vi.stubGlobal(
        "matchMedia",
        vi.fn(() => ({ matches: false })),
      );
      expect(matchBreakpoint(bp, 0)).toBe(false);
    });
  });
});

describe("activeBreakpoint", () => {
  const breakpoints = [
    { id: "mobile", model: MOBILE, query: { maxWidth: 640 } },
    { id: "desktop", model: DESKTOP },
  ];

  test("the first matching breakpoint wins", () => {
    expect(activeBreakpoint(breakpoints, 500).id).toBe("mobile");
  });

  test("falls through to the catch-all when nothing matches", () => {
    expect(activeBreakpoint(breakpoints, 1000).id).toBe("desktop");
  });

  test("throws when given no breakpoints", () => {
    expect(() => activeBreakpoint([], 500)).toThrow(
      "useResponsiveModel requires at least one breakpoint.",
    );
  });
});

describe("useResponsiveModel", () => {
  test("returns the active model + a containerRef function, unlocked by default", () => {
    const { result } = renderHook(() =>
      useResponsiveModel({ breakpoints: [{ id: "desktop", model: DESKTOP }] }),
    );
    expect(typeof result.current.containerRef).toBe("function");
    expect(result.current.model).toBe(DESKTOP);
    expect(result.current.breakpoint).toBe("desktop");
    expect(result.current.isCompact).toBe(false);
    expect(result.current.draggableTabs).toBe(true);
    expect(result.current.draggableTabsets).toBe(true);
    expect(result.current.resizableSplits).toBe(true);
  });

  test("a compact breakpoint locks every structural interaction", () => {
    // width seeds POSITIVE_INFINITY, so a compact catch-all is the active one.
    const { result } = renderHook(() =>
      useResponsiveModel({ breakpoints: [{ compact: true, id: "stacked", model: MOBILE }] }),
    );
    expect(result.current.isCompact).toBe(true);
    expect(result.current.model).toBe(MOBILE);
    expect(result.current.draggableTabs).toBe(false);
    expect(result.current.draggableTabsets).toBe(false);
    expect(result.current.resizableSplits).toBe(false);
  });
});
