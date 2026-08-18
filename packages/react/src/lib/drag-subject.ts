import type { DragSubject, TabNode } from "@dashfoo/core";
import { tabNodeSchema } from "@dashfoo/core";
import type { Data } from "@dnd-kit/abstract";
import type { Draggable } from "@dnd-kit/dom";

type DashfooDragData =
  | { label?: string; type: "tab" }
  | { label?: string; layerId?: string; tabsetId: string; type: "tabset" }
  | { createTab: () => TabNode; label?: string; type: "external" };

type DragSource = Pick<Draggable, "data" | "id">;

const isTabFactory = (value: Data[string]): value is () => TabNode => typeof value === "function";

/** Beside the manager wiring, not the layer adapter: `dragstart` fires once per
 * gesture on the shared manager, above any one layer. */
const subjectFor = (source: DragSource): DragSubject | null => {
  const data = source.data;
  if (data.type === "tabset") {
    return { id: String(data.tabsetId), kind: "tabset" };
  }
  if (data.type === "external") {
    if (!isTabFactory(data.createTab)) {
      // oxlint-disable-next-line no-console
      console.warn("[dashfoo] external drag source is missing its createTab function");
      return null;
    }
    let candidate: ReturnType<typeof data.createTab>;
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
export type { DashfooDragData, DragSource };
