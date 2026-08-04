import type { Dashfoo, TabsetNode } from "@dashfoo/core";
import { dragDockMachine } from "@dashfoo/core";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { useState } from "react";
import { describe, expect, test } from "vitest";
import { createActor } from "xstate";

import type { DragRootContextValue } from "../hooks/drag-hooks";
import { createDragManager, DragRootContext } from "../hooks/drag-hooks";
import { useDashfooStore } from "../hooks/store";
import { fallbackSelectedIndex } from "../lib/tab-selection";

import { Layout } from "./layout";
import { Tabset } from "./tabset/tabset";

describe("fallbackSelectedIndex", () => {
  test("removing the first tab falls forward to the next", () => {
    expect(fallbackSelectedIndex(3, 0)).toBe(1);
  });
  test("removing a middle tab falls forward to the next", () => {
    expect(fallbackSelectedIndex(3, 1)).toBe(2);
  });
  test("removing the last tab falls back to the previous", () => {
    expect(fallbackSelectedIndex(3, 2)).toBe(1);
  });
  test("removing the only tab yields -1 (no neighbour)", () => {
    expect(fallbackSelectedIndex(1, 0)).toBe(-1);
  });
});

const soleTabModel = (): Dashfoo => ({
  activeTabsetId: "ts1",
  global: {},
  layout: {
    children: [
      {
        children: [{ component: "chart", id: "t1", name: "Chart", type: "tab" }],
        id: "ts1",
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

const renderTabContent = (): ReactNode => <div>CHART</div>;

const DraggedSoleTabset = ({ keepMounted }: { keepMounted: boolean }): ReactNode => {
  const store = useDashfooStore({ defaultModel: soleTabModel() });
  const [dragRoot] = useState<DragRootContextValue>(() => {
    const actorRef = createActor(dragDockMachine).start();
    actorRef.send({ subject: { id: "t1", kind: "tab" }, type: "START" });
    return { actorRef, manager: createDragManager(), registerScope: () => () => {} };
  });
  const tabset = store.model.layout.children[0] as TabsetNode;

  return (
    <DragRootContext.Provider value={dragRoot}>
      <Layout.Root
        dispatch={store.dispatch}
        keepMounted={keepMounted}
        model={store.model}
        renderTab={renderTabContent}
      >
        <Tabset.Root node={tabset}>
          <Tabset.Content />
        </Tabset.Root>
      </Layout.Root>
    </DragRootContext.Provider>
  );
};

describe("dragging the only tab out of a tabset", () => {
  test("renders an empty panel, not the dragged tab's content", () => {
    const { container } = render(<DraggedSoleTabset keepMounted={false} />);

    expect(screen.queryByText("CHART")).not.toBeInTheDocument();
    expect(screen.queryByRole("tabpanel")).not.toBeInTheDocument();
    expect(container.querySelector('[data-dashfoo="tabcontent"]')).toBeInTheDocument();
  });

  test("keepMounted keeps the panel mounted but hidden and without the tabpanel role", () => {
    render(<DraggedSoleTabset keepMounted />);

    expect(screen.getByText("CHART")).not.toBeVisible();
    expect(screen.queryByRole("tabpanel")).not.toBeInTheDocument();
  });
});
