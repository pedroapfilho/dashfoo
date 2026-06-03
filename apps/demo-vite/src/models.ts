import type { Dashfoo, TabNode } from "@dashfoo/core";

const tab = (id: string, name: string, component = id): TabNode => ({
  component,
  id,
  name,
  type: "tab",
});

// The hero: a dense trading terminal — chart + depth, order book + trades,
// positions/orders/balances.
const tradingModel = (): Dashfoo => ({
  activeTabsetId: "ts-chart",
  borders: [],
  global: {},
  layout: {
    children: [
      {
        children: [tab("chart", "Chart"), tab("depth", "Depth")],
        id: "ts-chart",
        selected: 0,
        type: "tabset",
        weight: 2,
      },
      {
        children: [
          {
            children: [tab("book", "Order Book"), tab("trades", "Trades")],
            id: "ts-book",
            selected: 0,
            type: "tabset",
            weight: 1,
          },
          {
            children: [
              tab("positions", "Positions"),
              tab("orders", "Orders"),
              tab("balances", "Balances"),
            ],
            id: "ts-positions",
            selected: 0,
            type: "tabset",
            weight: 1,
          },
        ],
        id: "right",
        orientation: "column",
        type: "row",
        weight: 1,
      },
    ],
    id: "root",
    orientation: "row",
    type: "row",
  },
  version: 1,
});

// A sandbox for stacking/splitting/reordering by dragging tabs.
const dockingModel = (): Dashfoo => ({
  activeTabsetId: "a",
  borders: [],
  global: {},
  layout: {
    children: [
      {
        children: [tab("chart", "Chart"), tab("depth", "Depth"), tab("notes", "Notes")],
        id: "a",
        selected: 0,
        type: "tabset",
        weight: 1,
      },
      {
        children: [tab("book", "Order Book"), tab("trades", "Trades")],
        id: "b",
        selected: 0,
        type: "tabset",
        weight: 1,
      },
    ],
    id: "root",
    orientation: "row",
    type: "row",
  },
  version: 1,
});

// Exercises the tabset chrome: close, rename (double-click), maximize.
const chromeModel = (): Dashfoo => ({
  activeTabsetId: "main",
  borders: [],
  global: {},
  layout: {
    children: [
      {
        children: [tab("chart", "Chart"), tab("depth", "Depth"), tab("notes", "Notes")],
        id: "main",
        selected: 0,
        type: "tabset",
        weight: 3,
      },
      {
        children: [tab("positions", "Positions"), tab("orders", "Orders")],
        id: "side",
        selected: 0,
        type: "tabset",
        weight: 2,
      },
    ],
    id: "root",
    orientation: "row",
    type: "row",
  },
  version: 1,
});

// Left nav + bottom console border panels around a center document.
const bordersModel = (): Dashfoo => ({
  activeTabsetId: "editor",
  borders: [
    {
      children: [tab("files", "Files"), tab("outline", "Outline"), tab("explorer", "Explorer")],
      edge: "left",
      selected: 0,
      type: "border",
    },
    {
      children: [
        tab("console", "Console"),
        tab("problems", "Problems"),
        tab("terminal", "Terminal"),
      ],
      edge: "bottom",
      selected: -1,
      type: "border",
    },
  ],
  global: {},
  layout: {
    children: [
      {
        children: [tab("chart", "Chart"), tab("trades", "Trades")],
        id: "editor",
        selected: 0,
        type: "tabset",
      },
    ],
    id: "root",
    orientation: "row",
    type: "row",
  },
  version: 1,
});

// A small layout used to demonstrate persistence and controlled mode.
const playgroundModel = (): Dashfoo => ({
  activeTabsetId: "left",
  borders: [],
  global: {},
  layout: {
    children: [
      {
        children: [tab("chart", "Chart"), tab("depth", "Depth")],
        id: "left",
        selected: 0,
        type: "tabset",
        weight: 1,
      },
      {
        children: [tab("positions", "Positions"), tab("trades", "Trades")],
        id: "right",
        selected: 0,
        type: "tabset",
        weight: 1,
      },
    ],
    id: "root",
    orientation: "row",
    type: "row",
  },
  version: 1,
});

export { bordersModel, chromeModel, dockingModel, playgroundModel, tradingModel };
