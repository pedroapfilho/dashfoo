import type { Dashfoo, DragSubject } from "@dashfoo/core";
import { collectTabsets, findTab, model, row, tab, tabset } from "@dashfoo/core";
import { act, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { useContext } from "react";
import { assert, beforeEach, describe, expect, test } from "vitest";

import { Layout } from "../components/layout";
import { useLayout } from "../hooks/layout-store";
import { useDashfooStore } from "../hooks/store";

import type { DragContextValue } from "./drag-context";
import { DragContext } from "./drag-context";
import { DashfooDragProvider } from "./drag-root";
import { subjectFor } from "./drag-subject";

type DocumentSnapshot = { context: DragContextValue; documentId: string; model: Dashfoo };

const documents = new Map<string, DocumentSnapshot>();

beforeEach(() => {
  documents.clear();
});

const Probe = ({ name, value }: { name: string; value: Dashfoo }): null => {
  const context = useContext(DragContext);
  const documentId = useLayout((state) => state.documentId);
  assert(context);
  documents.set(name, { context, documentId, model: value });

  return null;
};

const Document = ({
  children,
  name,
  prefix = "",
}: {
  children?: ReactNode;
  name: string;
  prefix?: string;
}): ReactNode => {
  const store = useDashfooStore({
    defaultModel: model(
      row([
        tabset(
          [
            tab("probe", "First", { id: `${prefix}t1` }),
            tab("probe", "Second", { id: `${prefix}t2` }),
          ],
          { id: `${prefix}ts1` },
        ),
        tabset([tab("probe", "Target", { id: `${prefix}t3` })], { id: `${prefix}ts2` }),
      ]),
    ),
  });

  return (
    <Layout.Root
      data-testid={name}
      dispatch={store.dispatch}
      model={store.model}
      renderers={{ tab: (node) => (node.id === `${prefix}t1` ? children : null) }}
    >
      <Layout.DragLayer>
        <Probe name={name} value={store.model} />
        <Layout.Rows node={store.model.layout} />
      </Layout.DragLayer>
    </Layout.Root>
  );
};

const captured = (name: string): DocumentSnapshot => {
  const value = documents.get(name);
  assert(value);

  return value;
};

const commitTo = (target: DocumentSnapshot, subject: DragSubject): void => {
  const actor = target.context.actorRef;
  const scope = target.context.layerId;
  assert(scope !== null);
  act(() => {
    actor.send({ subject, type: "START" });
    actor.send({ drop: { intent: { location: "center", targetId: "ts2" }, scope }, type: "OVER" });
    actor.send({ type: "DROP" });
  });
};

describe.each(["sibling", "nested"] as const)("%s documents sharing a manager", (topology) => {
  test.each(["", "other-"])("isolate local ids with prefix '%s'", async (prefix) => {
    const second = <Document name="second" prefix={prefix} />;
    render(
      <DashfooDragProvider>
        <Document name="first">{topology === "nested" ? second : null}</Document>
        {topology === "sibling" ? second : null}
      </DashfooDragProvider>,
    );
    await Promise.resolve();
    const first = captured("first");
    const other = captured("second");
    expect(other.context.manager).toBe(first.context.manager);
    expect(other.documentId).not.toBe(first.documentId);
    const registrations = [...first.context.manager.registry.draggables];
    expect(registrations).toHaveLength(10);
    expect(new Set(registrations.map((source) => source.id)).size).toBe(10);

    for (const kind of ["tab", "tabset"] as const) {
      const source = registrations.find(
        (entry) => entry.data.documentId === other.documentId && entry.data.type === kind,
      );

      assert(source);
      const subject = subjectFor(source);
      assert(subject);
      act(() => {
        first.context.actorRef.send({ subject, type: "START" });
      });
      const target = screen.getByTestId("first");
      expect(target.querySelector('[data-dashfoo="tab"][data-tab-id="t1"]')).toHaveAttribute(
        "aria-selected",
        "true",
      );
      expect(target.querySelector('[data-dashfoo="tabset"]')).not.toHaveAttribute(
        "data-dragging-source",
      );
      commitTo(first, subject);
      expect(captured("first").model).toBe(first.model);
      expect(captured("second").model).toBe(other.model);
    }

    expect(document.querySelectorAll("[data-dragging]")).toHaveLength(0);
    const local: DragSubject = { documentId: first.documentId, id: "t2", kind: "tab" };
    commitTo(first, local);
    expect(findTab(captured("first").model, "t2")?.container.id).toBe("ts2");
    expect(collectTabsets(captured("second").model).flatMap((node) => node.children)).toHaveLength(
      3,
    );
  });
});
