import type { Draggable } from "@dnd-kit/dom";
import { Accessibility, DragDropManager, Feedback, PointerSensor } from "@dnd-kit/dom";

import { isElement } from "../lib/dom";
import { startsOnControl } from "../lib/interactive";
import { closestPart, PART } from "../lib/parts";

import { isNativeSource } from "./native-drag";

/** A press on a tab drags that tab or nothing: never the tabset whose header holds it. */
const startsOnOtherTab = (target: EventTarget | null, source: Draggable): boolean => {
  const item = isElement(target) ? closestPart(target, PART.tabItem) : null;

  return item !== null && !(source.element && item.contains(source.element));
};

const preventActivation = (event: PointerEvent, source: Draggable): boolean =>
  startsOnControl(event.target, source.element) ||
  startsOnOtherTab(event.target, source) ||
  (event.pointerType === "mouse" && isNativeSource(source.element));

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
