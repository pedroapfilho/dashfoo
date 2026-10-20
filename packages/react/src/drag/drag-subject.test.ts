import { describe, expect, test, vi } from "vitest";

import { subjectFor } from "./drag-subject";

describe("subjectFor", () => {
  test.each([{ type: "tab" }, { documentId: "doc", type: "tabset" }, { id: "t1", type: "other" }])(
    "rejects an incomplete or unknown internal source: %j",
    (data) => {
      const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
      expect(subjectFor({ data, id: "registration" })).toBeNull();
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining("missing its document or node identity"),
      );
      warn.mockRestore();
    },
  );
  test("tabset source returns tabset subject with tabsetId", () => {
    const result = subjectFor({
      data: { documentId: "doc", id: "ts1", type: "tabset" },
      id: "grip-ts1",
    });
    expect(result).toEqual({ documentId: "doc", id: "ts1", kind: "tabset" });
  });

  test("tab source preserves document and model ids independently of its registration", () => {
    const result = subjectFor({
      data: { documentId: "doc", id: "t1", type: "tab" },
      id: "registration-id",
    });
    expect(result).toEqual({ documentId: "doc", id: "t1", kind: "tab" });
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
