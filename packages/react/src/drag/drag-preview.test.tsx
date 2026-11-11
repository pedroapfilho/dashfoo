import type { Point } from "@dashfoo/core";
import { act, render } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";

import { createDragManager } from "./drag-manager";
import { DragPreviewOverlay } from "./drag-preview";

describe("DragPreviewOverlay", () => {
  test("flags a tear-off from the point the pointer moved to, not the stale position", () => {
    const manager = createDragManager();
    const isTearOff = vi.fn((point: Point) => point.x < 0);
    const { container } = render(<DragPreviewOverlay isTearOff={isTearOff} manager={manager} />);
    const source = { data: { label: "Notes" }, element: document.createElement("button") };
    const operation = { position: { current: { x: 20, y: 20 } }, source };

    act(() => {
      manager.monitor.dispatch("dragstart", { operation } as never);
      manager.monitor.dispatch("dragmove", { operation, to: { x: -5, y: 20 } } as never);
    });

    expect(isTearOff).toHaveBeenLastCalledWith({ x: -5, y: 20 });
    expect(container.querySelector('[data-dashfoo="drag-preview"][data-tear-off]')).not.toBeNull();
    manager.destroy();
  });
});
