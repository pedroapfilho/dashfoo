import { describe, expect, test, vi } from "vitest";

import { subjectFor } from "./drag-adapter";

describe("subjectFor", () => {
  test("tabset source returns tabset subject with tabsetId", () => {
    const result = subjectFor({ data: { tabsetId: "ts1", type: "tabset" }, id: "grip-ts1" });
    expect(result).toEqual({ id: "ts1", kind: "tabset" });
  });

  test("plain tab source returns tab subject with source id", () => {
    const result = subjectFor({ data: { type: "tab" }, id: "t1" });
    expect(result).toEqual({ id: "t1", kind: "tab" });
  });

  test("external source with valid createTab returns external subject carrying the tab", () => {
    const tab = { component: "metrics", id: "w1", name: "Metrics", type: "tab" as const };
    const result = subjectFor({
      data: { createTab: () => tab, type: "external" },
      id: "external-1",
    });
    expect(result).toEqual({ id: "external-1", kind: "external", tab });
  });

  test("external source without createTab returns null and warns", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = subjectFor({ data: { type: "external" }, id: "external-2" });

    expect(result).toBeNull();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("missing its createTab"));

    warn.mockRestore();
  });

  test("external source with createTab returning invalid shape returns null and warns", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = subjectFor({
      data: { createTab: () => ({}), type: "external" },
      id: "external-3",
    });

    expect(result).toBeNull();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("invalid tab"), expect.anything());

    warn.mockRestore();
  });

  test("external source with createTab that throws returns null and warns", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const boom = new Error("widget catalog unavailable");

    const result = subjectFor({
      data: {
        createTab: () => {
          throw boom;
        },
        type: "external",
      },
      id: "external-4",
    });

    expect(result).toBeNull();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("createTab threw"), boom);

    warn.mockRestore();
  });
});
