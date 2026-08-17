import type { Action, FloatNode, TabsetNode } from "@dashfoo/core";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { FloatTitleEditor } from "./float-panel";
import { RenameEditor } from "./tabset/tabset-rename-input";
import { createTabsetStore, TabContext, TabsetStoreContext } from "./tabset/tabset-store";

const CURRENT_NAME = "Chart";

type Harness = {
  dispatched: Array<Action>;
  expectClosed: () => void;
  input: HTMLInputElement;
};

const renameNames = (dispatched: Array<Action>): Array<string> =>
  dispatched.flatMap((action) =>
    action.type === "renameFloat" || action.type === "renameTab" ? [action.name] : [],
  );

const renderFloatEditor = (): Harness => {
  const dispatched: Array<Action> = [];
  let closed = false;
  const node: FloatNode = {
    geometry: { height: 300, left: 0, top: 0, width: 400 },
    id: "f1",
    layout: { children: [], id: "frow", orientation: "row", type: "row", weight: 1 },
    name: CURRENT_NAME,
    type: "float",
  };
  render(
    <FloatTitleEditor
      dispatch={(action) => {
        dispatched.push(action);
      }}
      node={node}
      onDone={() => {
        closed = true;
      }}
    />,
  );
  return {
    dispatched,
    expectClosed: () => {
      expect(closed).toBe(true);
    },
    input: screen.getByRole("textbox"),
  };
};

const renderTabEditor = (): Harness => {
  const dispatched: Array<Action> = [];
  const node: TabsetNode = {
    children: [{ component: "c", id: "t1", name: CURRENT_NAME, type: "tab" }],
    id: "ts1",
    selected: 0,
    type: "tabset",
    weight: 1,
  };
  const store = createTabsetStore({
    activeTab: node.children[0],
    dispatch: (action) => {
      dispatched.push(action);
    },
    isMaximized: false,
    node,
    showMaximize: false,
    tabsClosable: false,
    tabsRenamable: true,
    visualSelected: 0,
  });
  store.setState({ editingTabId: "t1" });
  render(
    <TabsetStoreContext.Provider value={store}>
      <TabContext.Provider value={{ index: 0, tab: node.children[0] }}>
        <RenameEditor />
      </TabContext.Provider>
    </TabsetStoreContext.Provider>,
  );
  return {
    dispatched,
    expectClosed: () => {
      expect(store.getState().editingTabId).toBeNull();
    },
    input: screen.getByRole("textbox"),
  };
};

describe.each([
  ["FloatTitleEditor", renderFloatEditor],
  ["RenameEditor", renderTabEditor],
])("%s inline rename lifecycle", (_editor, setup) => {
  test("Enter commits exactly one rename dispatch", () => {
    const { dispatched, expectClosed, input } = setup();

    fireEvent.change(input, { target: { value: "Inspector" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(renameNames(dispatched)).toEqual(["Inspector"]);
    expectClosed();
  });

  test("Escape dispatches nothing and closes the editor", () => {
    const { dispatched, expectClosed, input } = setup();

    fireEvent.change(input, { target: { value: "Inspector" } });
    fireEvent.keyDown(input, { key: "Escape" });

    expect(renameNames(dispatched)).toEqual([]);
    expectClosed();
  });

  test("blur after Enter dispatches exactly once", () => {
    const { dispatched, input } = setup();

    fireEvent.change(input, { target: { value: "Inspector" } });
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.blur(input);

    expect(renameNames(dispatched)).toEqual(["Inspector"]);
  });

  test("blur after Escape dispatches nothing", () => {
    const { dispatched, input } = setup();

    fireEvent.change(input, { target: { value: "Inspector" } });
    fireEvent.keyDown(input, { key: "Escape" });
    fireEvent.blur(input);

    expect(renameNames(dispatched)).toEqual([]);
  });

  test("blur alone commits the trimmed value once", () => {
    const { dispatched, expectClosed, input } = setup();

    fireEvent.change(input, { target: { value: "  Inspector  " } });
    fireEvent.blur(input);

    expect(renameNames(dispatched)).toEqual(["Inspector"]);
    expectClosed();
  });

  test("blur with the unchanged value dispatches nothing", () => {
    const { dispatched, expectClosed, input } = setup();

    fireEvent.blur(input);

    expect(renameNames(dispatched)).toEqual([]);
    expectClosed();
  });

  test("blur with a whitespace-only value dispatches nothing", () => {
    const { dispatched, expectClosed, input } = setup();

    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.blur(input);

    expect(renameNames(dispatched)).toEqual([]);
    expectClosed();
  });
});
