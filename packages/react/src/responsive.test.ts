import type { Dashfoo } from "@dashfoo/core";
import { renderHook } from "@testing-library/react";
import { describe, expect, test } from "vitest";

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
});

describe("useResponsiveModel", () => {
  test("returns the active model + a containerRef function", () => {
    const { result } = renderHook(() =>
      useResponsiveModel({ breakpoints: [{ id: "desktop", model: DESKTOP }] }),
    );
    expect(typeof result.current.containerRef).toBe("function");
    expect(result.current.defaultModel).toBe(DESKTOP);
    expect(result.current.breakpoint).toBe("desktop");
    expect(typeof result.current.key).toBe("string");
  });
});
