import type { Dashfoo, TabsetNode } from "@dashfoo/core";
import { dragDockMachine, fallbackSelectedIndex } from "@dashfoo/core";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { useContext, useEffect, useState } from "react";
import { describe, expect, test } from "vitest";
import { createActor } from "xstate";

import type { DragContextValue } from "../drag/drag-context";
import { DragContext } from "../drag/drag-context";
import { createDragManager } from "../drag/drag-manager";
import { useLayout } from "../hooks/layout-store";
import { useDashfooStore } from "../hooks/store";

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
  floats: [],
  global: {},
  layout: {
    children: [
      {
        children: [{ component: "chart", id: "t1", name: "Chart", type: "tab" }],
        id: "ts1",
        selected: 0,
        type: "tabset",
        weight: 1,
      },
    ],
    id: "root",
    orientation: "row",
    type: "row",
    weight: 1,
  },
  version: 1,
});

const renderTabContent = (): ReactNode => <div>CHART</div>;

const StartTabDrag = (): null => {
  const actorRef = useContext(DragContext)?.actorRef;
  const documentId = useLayout((state) => state.documentId);
  useEffect(() => {
    actorRef?.send({ subject: { documentId, id: "t1", kind: "tab" }, type: "START" });
  }, [actorRef, documentId]);

  return null;
};

const DraggedSoleTabset = ({ keepMounted }: { keepMounted: boolean }): ReactNode => {
  const store = useDashfooStore({ defaultModel: soleTabModel() });

  const [dragRoot] = useState<DragContextValue>(() => {
    const actorRef = createActor(dragDockMachine).start();

    return {
      actorRef,
      layerId: null,
      manager: createDragManager(),
      registerLayer: () => () => {},
    };
  });

  const tabset = store.model.layout.children[0] as TabsetNode;

  return (
    <DragContext.Provider value={dragRoot}>
      <Layout.Root
        dispatch={store.dispatch}
        keepMounted={keepMounted}
        model={store.model}
        renderers={{ tab: renderTabContent }}
      >
        <StartTabDrag />
        <Tabset.Root node={tabset}>
          <Tabset.Content />
        </Tabset.Root>
      </Layout.Root>
    </DragContext.Provider>
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
