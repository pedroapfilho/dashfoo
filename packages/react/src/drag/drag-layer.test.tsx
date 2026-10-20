import type { Action, Dashfoo, DragSubject } from "@dashfoo/core";
import { render } from "@testing-library/react";
import { useContext } from "react";
import { assert, describe, expect, test, vi } from "vitest";

import { Layout } from "../components/layout";
import type { LayoutRootProps } from "../components/layout-root";
import type { LayoutStore } from "../hooks/layout-store";
import { LayoutStoreContext } from "../hooks/layout-store";

import { createLayer } from "./drag-layer";

const model: Dashfoo = {
  floats: [],
  global: {},
  layout: { children: [], id: "root", orientation: "row", type: "row", weight: 1 },
  version: 1,
};
const tab = { component: "widget", id: "new-tab", name: "Widget", type: "tab" } as const;
const external: DragSubject = { id: "factory", kind: "external", tab };
const action: Action = { location: "center", tab, targetId: "target", type: "addNode" };

const mountLayer = (options: Partial<LayoutRootProps> = {}) => {
  const captured: { current: LayoutStore | null } = { current: null };
  const Probe = (): null => {
    captured.current = useContext(LayoutStoreContext);
    return null;
  };
  const dispatch = vi.fn<(action: Action) => void>();
  const tree = (props: Partial<LayoutRootProps>) => (
    <Layout.Root dispatch={dispatch} model={model} renderers={{ tab: () => null }} {...props}>
      <Probe />
    </Layout.Root>
  );
  const view = render(tree(options));
  const store = captured.current;
  assert(store !== null);
  const layer = createLayer("main", store);
  const element = document.createElement("div");
  element.getBoundingClientRect = () => new DOMRect(0, 0, 400, 300);
  const resolve = (subject: DragSubject, x = 200) =>
    layer.resolveIntent(subject, "target", element, { x, y: 150 });
  return {
    dispatch,
    layer,
    resolve,
    store,
    update: (props: Partial<LayoutRootProps>): void => {
      view.rerender(tree(props));
    },
  };
};

describe("document drop boundary", () => {
  test.each(["tab", "tabset"] as const)("rejects a foreign %s at resolution and commit", (kind) => {
    const target = mountLayer();
    for (const id of ["same-id", "different-id"]) {
      const subject: DragSubject = { documentId: "other-document", id, kind };
      expect(target.resolve(subject)).toBeNull();
      target.layer.commit(action, subject);
    }
    expect(target.dispatch).not.toHaveBeenCalled();
  });

  test.each(["tab", "tabset"] as const)(
    "accepts a %s from another layer of the same document",
    (kind) => {
      const target = mountLayer();
      const subject: DragSubject = {
        documentId: target.store.getState().documentId,
        id: "source",
        kind,
      };
      expect(target.resolve(subject)).toEqual({ location: "center", targetId: "target" });
      target.layer.commit(action, subject);
      expect(target.dispatch).toHaveBeenCalledWith(action);
    },
  );

  test("external factories can insert into a document", () => {
    const target = mountLayer();
    expect(target.resolve(external)).not.toBeNull();
    target.layer.commit(action, external);
    expect(target.dispatch).toHaveBeenCalledWith(action);
  });
});

describe("structural drop permission", () => {
  test.each([{ editable: false }, { editable: true, restructurable: false }])(
    "rejects external drops with %j",
    (options) => {
      const target = mountLayer(options);
      expect(target.resolve(external)).toBeNull();
      target.layer.commit(action, external);
      expect(target.dispatch).not.toHaveBeenCalled();
    },
  );

  test("rechecks permission if the layout locks between intent and commit", () => {
    const target = mountLayer();
    expect(target.resolve(external)).not.toBeNull();
    target.update({ editable: true, restructurable: false });
    expect(target.resolve(external)).toBeNull();
    target.layer.commit(action, external);
    expect(target.dispatch).not.toHaveBeenCalled();
    target.update({ restructurable: true });
    target.layer.commit(action, external);
    expect(target.dispatch).toHaveBeenCalledOnce();
  });

  test("center-only docking and disabled internal sources still accept external tabs", () => {
    const target = mountLayer({
      draggableTabs: false,
      model: { ...model, global: { enableSplitDock: false } },
    });
    expect(target.resolve(external, 1)).toEqual({ location: "center", targetId: "target" });
    target.layer.commit(action, external);
    expect(target.dispatch).toHaveBeenCalledWith(action);
  });
});
