import type { Dashfoo } from "@dashfoo/core";
import { model, row, tab, tabset } from "@dashfoo/core";

const showcaseModel = (): Dashfoo =>
  model(
    row(
      [
        tabset([tab("chart", "Overview"), tab("table", "Orders")], {
          id: "main",
          weight: 2,
        }),
        row(
          [
            tabset([tab("activity", "Activity")], { id: "side-top", weight: 1 }),
            tabset([tab("code", "Snippet")], { id: "side-bottom", weight: 1 }),
          ],
          { id: "side", orientation: "column", weight: 1 },
        ),
      ],
      { id: "root" },
    ),
    { activeTabsetId: "main" },
  );

export { showcaseModel };
