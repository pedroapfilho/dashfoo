import type { Draggable } from "@dnd-kit/dom";
import { Accessibility, DragDropManager, Feedback, PointerSensor } from "@dnd-kit/dom";

import { isElement } from "../lib/dom";
import { startsOnControl } from "../lib/interactive";

/** A press on a tab drags that tab or nothing: never the tabset whose header holds it. */
const startsOnOtherTab = (target: EventTarget | null, source: Draggable): boolean => {
  const item = isElement(target) ? target.closest('[data-dashfoo="tab-item"]') : null;

  return item !== null && !(source.element && item.contains(source.element));
};

/** A mouse press on a node in a drag group is the browser's drag and drop to run, not dnd-kit's. */
const preventActivation = (event: PointerEvent, source: Draggable): boolean =>
  startsOnControl(event.target, source.element) ||
  startsOnOtherTab(event.target, source) ||
  (event.pointerType === "mouse" && source.element?.getAttribute("draggable") === "true");

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
