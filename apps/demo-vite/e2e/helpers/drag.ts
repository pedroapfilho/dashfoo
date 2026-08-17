import type { Locator, Page } from "@playwright/test";

/**
 * dnd-kit's PointerSensor needs a nudge past its activation threshold, and its
 * collision pass needs a second move at the destination to settle before the
 * release. Both were copied into every spec that drags.
 */
const dragElementTo = async (page: Page, source: Locator, x: number, y: number): Promise<void> => {
  const box = await source.boundingBox();
  if (!box) {
    throw new Error("no bounding box for the drag source");
  }
  const fromX = box.x + box.width / 2;
  const fromY = box.y + box.height / 2;

  await page.mouse.move(fromX, fromY);
  await page.mouse.down();
  await page.mouse.move(fromX + 8, fromY + 8);
  await page.mouse.move(x, y, { steps: 16 });
  await page.mouse.move(x, y, { steps: 4 });
  await page.mouse.up();
};

const dragTabTo = (page: Page, label: string, x: number, y: number): Promise<void> =>
  dragElementTo(page, page.getByRole("tab", { name: label }), x, y);

export { dragElementTo, dragTabTo };
