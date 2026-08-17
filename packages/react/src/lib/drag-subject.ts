import type { DragSubject } from "@dashfoo/core";
import { tabNodeSchema } from "@dashfoo/core";

const isTabFactory = (value: unknown): value is () => unknown => typeof value === "function";

/** Beside the manager wiring, not the layer adapter: `dragstart` fires once per
 * gesture on the shared manager, above any one layer. */
const subjectFor = (source: {
  data?: Record<string, unknown>;
  id: string | number;
}): DragSubject | null => {
  const data = source.data;
  if (data?.type === "tabset") {
    return { id: String(data.tabsetId), kind: "tabset" };
  }
  if (data?.type === "external") {
    if (!isTabFactory(data.createTab)) {
      // oxlint-disable-next-line no-console
      console.warn("[dashfoo] external drag source is missing its createTab function");
      return null;
    }
    let candidate: unknown;
    try {
      candidate = data.createTab();
    } catch (error) {
      // oxlint-disable-next-line no-console
      console.warn("[dashfoo] external drag source createTab threw", error);
      return null;
    }
    const parsed = tabNodeSchema.safeParse(candidate);
    if (!parsed.success) {
      // oxlint-disable-next-line no-console
      console.warn("[dashfoo] external drag source returned an invalid tab", parsed.error);
      return null;
    }
    return { id: String(source.id), kind: "external", tab: parsed.data };
  }
  return { id: String(source.id), kind: "tab" };
};

export { subjectFor };
