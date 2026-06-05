import type { Dashfoo } from "@dashfoo/core";
import { model, row, tab, tabset } from "@dashfoo/core";

// The hero: a dense trading terminal — chart + depth, order book + trades,
// positions/orders/balances.
const tradingModel = (): Dashfoo =>
  model(
    row(
      [
        tabset([tab("chart", "Chart"), tab("depth", "Depth")], {
          id: "ts-chart",
          weight: 2,
        }),
        row(
          [
            tabset([tab("book", "Order Book"), tab("trades", "Trades")], {
              id: "ts-book",
              weight: 1,
            }),
            tabset(
              [tab("positions", "Positions"), tab("orders", "Orders"), tab("balances", "Balances")],
              { id: "ts-positions", weight: 1 },
            ),
          ],
          { id: "right", orientation: "column", weight: 1 },
        ),
      ],
      { id: "root" },
    ),
    { activeTabsetId: "ts-chart" },
  );

// A sandbox for stacking/splitting/reordering by dragging tabs.
const dockingModel = (): Dashfoo =>
  model(
    row(
      [
        tabset([tab("chart", "Chart"), tab("depth", "Depth"), tab("notes", "Notes")], {
          id: "a",
          weight: 1,
        }),
        tabset([tab("book", "Order Book"), tab("trades", "Trades")], {
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
        tabset([tab("chart", "Chart"), tab("depth", "Depth"), tab("notes", "Notes")], {
          id: "main",
          weight: 3,
        }),
        tabset([tab("positions", "Positions"), tab("orders", "Orders")], {
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
        tabset([tab("chart", "Chart"), tab("depth", "Depth")], {
          id: "left",
          weight: 1,
        }),
        tabset([tab("positions", "Positions"), tab("trades", "Trades")], {
          id: "right",
          weight: 1,
        }),
      ],
      { id: "root" },
    ),
    { activeTabsetId: "left" },
  );

export { chromeModel, dockingModel, playgroundModel, tradingModel };
