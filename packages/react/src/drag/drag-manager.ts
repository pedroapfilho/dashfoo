import type { Draggable } from "@dnd-kit/dom";
import { Accessibility, DragDropManager, Feedback, PointerSensor } from "@dnd-kit/dom";

import { startsOnControl } from "../lib/interactive";

const preventActivation = (event: PointerEvent, source: Draggable): boolean =>
  startsOnControl(event.target, source.element);

type DashfooDragManager = DragDropManager;

/** Feedback stays: it is the only plugin that sets the drag shape collision detection reads. */
const createDragManager = (): DashfooDragManager =>
  new DragDropManager({
    plugins: (defaults) => [
      ...defaults.filter((plugin) => plugin !== Accessibility && plugin !== Feedback),
      Feedback.configure({ dropAnimation: null }),
    ],
    sensors: () => [PointerSensor.configure({ preventActivation })],
  });

export { createDragManager };

export type { DashfooDragManager };
