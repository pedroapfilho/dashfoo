import type { Dashfoo } from "@dashfoo/core";
import { model, row, tab, tabset } from "@dashfoo/core";
import type { ResponsiveOptions } from "@dashfoo/react";

const overviewModel = (): Dashfoo =>
  model(
    row(
      [
        tabset([tab("canvas", "Canvas"), tab("detail", "Detail")], {
          id: "ts-main",
          weight: 2,
        }),
        row(
          [
            tabset([tab("activity", "Activity"), tab("tasks", "Tasks")], {
              id: "ts-side-top",
              weight: 1,
            }),
            tabset(
              [tab("metrics", "Metrics"), tab("history", "History"), tab("reports", "Reports")],
              { id: "ts-side-bottom", weight: 1 },
            ),
          ],
          { id: "right", orientation: "column", weight: 1 },
        ),
      ],
      { id: "root" },
    ),
    { activeTabsetId: "ts-main" },
  );

const dockingModel = (): Dashfoo =>
  model(
    row(
      [
        tabset([tab("canvas", "Canvas"), tab("detail", "Detail"), tab("notes", "Notes")], {
          id: "a",
          min: 180,
          weight: 1,
        }),
        tabset([tab("activity", "Activity"), tab("tasks", "Tasks")], {
          id: "b",
          weight: 1,
        }),
      ],
      { id: "root" },
    ),
    { activeTabsetId: "a" },
  );

const playgroundModel = (): Dashfoo =>
  model(
    row(
      [
        tabset([tab("canvas", "Canvas"), tab("detail", "Detail")], {
          id: "left",
          weight: 1,
        }),
        tabset([tab("metrics", "Metrics"), tab("tasks", "Tasks")], {
          id: "right",
          weight: 1,
        }),
      ],
      { id: "root" },
    ),
    { activeTabsetId: "left" },
  );

/** Every demo page stacks at the same width. */
/** Two layouts in one drag group: their tab ids (the component keys) must not overlap. */
const windowsModels = () => ({
  main: model(
    row([tabset([tab("canvas", "Canvas"), tab("detail", "Detail"), tab("notes", "Notes")])]),
  ),
  side: model(
    row([
      tabset([tab("activity", "Activity"), tab("tasks", "Tasks")]),
      tabset([tab("metrics", "Metrics")]),
    ]),
  ),
});

const COMPACT: ResponsiveOptions = { maxWidth: 720 };

export { COMPACT, dockingModel, overviewModel, playgroundModel, windowsModels };
