import type { Dashfoo } from "@dashfoo/core";
import { model, row, tab, tabset } from "@dashfoo/core";

// The composite overview: a main tabset beside a column of two stacked tabsets.
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

// A sandbox for stacking/splitting/reordering by dragging tabs.
const dockingModel = (): Dashfoo =>
  model(
    row(
      [
        tabset([tab("canvas", "Canvas"), tab("detail", "Detail"), tab("notes", "Notes")], {
          id: "a",
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

// Exercises the tabset chrome: close, rename (double-click), maximize.
const chromeModel = (): Dashfoo =>
  model(
    row(
      [
        tabset([tab("canvas", "Canvas"), tab("detail", "Detail"), tab("notes", "Notes")], {
          id: "main",
          weight: 3,
        }),
        tabset([tab("metrics", "Metrics"), tab("history", "History")], {
          id: "side",
          weight: 2,
        }),
      ],
      { id: "root" },
    ),
    { activeTabsetId: "main" },
  );

// A small layout used to demonstrate persistence and controlled mode.
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

const sizingModel = (): Dashfoo =>
  model(
    row(
      [
        tabset([tab("navigator", "Navigator"), tab("alerts", "Alerts")], {
          id: "side",
          min: 180,
          weight: 1,
        }),
        tabset([tab("canvas", "Canvas"), tab("detail", "Detail"), tab("metrics", "Metrics")], {
          id: "main",
          weight: 3,
        }),
      ],
      { id: "root" },
    ),
    { activeTabsetId: "side" },
  );

export { chromeModel, dockingModel, overviewModel, playgroundModel, sizingModel };
