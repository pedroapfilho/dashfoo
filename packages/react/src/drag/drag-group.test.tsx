import type { Action, Dashfoo, TabNode } from "@dashfoo/core";
import { collectTabsets, findTab, model, row, tab, tabset } from "@dashfoo/core";
import { act, render } from "@testing-library/react";
import { useContext } from "react";
import { afterEach, assert, describe, expect, test, vi } from "vitest";

import { DashfooLayout } from "../layout/dashfoo-layout";
import type { DashfooLayoutCommonProps } from "../layout/dashfoo-layout";
import { Layout } from "../layout/layout";
import type { LayoutStore } from "../layout/layout-store";
import { LayoutStoreContext } from "../layout/layout-store";
import { useDashfooStore } from "../store/store";

import { createLayer } from "./drag-layer";
import { DashfooDragProvider } from "./drag-root";
import { MARKER_PREFIX, NODE_TYPE } from "./native-wire";
import type { TearOffHandler } from "./tear-off";

const factory = (node: TabNode) => <div>{node.name}</div>;

const layoutWith = (tabsetId: string, tabIds: Array<string>): Dashfoo =>
  model(
    row([
      tabset(
        tabIds.map((id) => tab("c", id, { id })),
        { id: tabsetId },
      ),
    ]),
  );

type Mounted = { changes: Array<Action | undefined>; latest: () => Dashfoo };

const mount = (
  name: string,
  initial: Dashfoo,
  props: Partial<DashfooLayoutCommonProps>,
): Mounted & { container: HTMLElement } => {
  const changes: Array<Action | undefined> = [];
  let current = initial;
  const container = document.createElement("div");
  container.dataset.name = name;
  document.body.append(container);

  render(
    <DashfooLayout
      defaultModel={initial}
      factory={factory}
      onModelChange={(next, action) => {
        current = next;
        changes.push(action);
      }}
      {...props}
    />,
    { container },
  );

  return { changes, container, latest: () => current };
};

/** jsdom has no DataTransfer; this keeps the parts the native drag path reads. */
const fakeTransfer = (): DataTransfer => {
  const data = new Map<string, string>();

  return {
    dropEffect: "none",
    effectAllowed: "all",
    getData: (type: string) => data.get(type) ?? "",
    setData: (type: string, value: string) => {
      data.set(type, value);
    },
    get types() {
      return [...data.keys()];
    },
  } as unknown as DataTransfer;
};

const fire = (
  target: Element,
  type: string,
  transfer: DataTransfer,
  init: { screenX?: number; screenY?: number } = {},
): Event => {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, ...init });
  Object.defineProperty(event, "dataTransfer", { value: transfer });
  target.dispatchEvent(event);

  return event;
};

const draggableTab = (container: HTMLElement, tabId: string): HTMLElement => {
  const element = container.querySelector<HTMLElement>(
    `[data-tab-id="${tabId}"] [draggable="true"], [draggable="true"][data-tab-id="${tabId}"]`,
  );

  assert(element, `no draggable tab "${tabId}"`);

  return element;
};

const tabsetElement = (container: HTMLElement, tabsetId: string): HTMLElement => {
  const element = container.querySelector<HTMLElement>(`[data-tabset-id="${tabsetId}"]`);
  assert(element);

  return element;
};

afterEach(() => {
  document.body.innerHTML = "";
  vi.useRealTimers();
});

describe("drag groups", () => {
  test("a tab dropped into another layout of the group moves there", async () => {
    const left = mount("left", layoutWith("a", ["a1", "a2"]), { dragGroup: "desk" });
    const right = mount("right", layoutWith("b", ["b1"]), { dragGroup: "desk" });
    await act(async () => {});

    const transfer = fakeTransfer();
    fire(draggableTab(left.container, "a2"), "dragstart", transfer);
    const target = tabsetElement(right.container, "b");
    expect(fire(target, "dragover", transfer).defaultPrevented).toBe(true);
    act(() => {
      fire(target, "drop", transfer);
    });

    expect(findTab(right.latest(), "a2")?.container.id).toBe("b");
    expect(findTab(left.latest(), "a2")).toBeUndefined();
    expect(right.changes.at(-1)).toMatchObject({ node: { id: "a2" }, type: "transferIn" });
    expect(left.changes.at(-1)).toEqual({ nodeId: "a2", type: "transferOut" });
  });

  test("an empty layout of the group takes a dropped tab", async () => {
    const left = mount("left", layoutWith("a", ["a1", "a2"]), { dragGroup: "desk" });
    const right = mount("right", model(row([], { id: "empty-root" })), { dragGroup: "desk" });
    await act(async () => {});

    const transfer = fakeTransfer();
    fire(draggableTab(left.container, "a1"), "dragstart", transfer);
    const target = right.container.querySelector('[data-dashfoo="layout-empty"]');
    assert(target);
    expect(fire(target, "dragover", transfer).defaultPrevented).toBe(true);
    act(() => {
      fire(target, "drop", transfer);
    });

    expect(
      collectTabsets(right.latest()).map(({ children }) => children.map(({ id }) => id)),
    ).toEqual([["a1"]]);
    expect(findTab(left.latest(), "a1")).toBeUndefined();
  });

  test("layouts in different groups refuse each other's drags", async () => {
    const left = mount("left", layoutWith("a", ["a1"]), { dragGroup: "desk" });
    const right = mount("right", layoutWith("b", ["b1"]), { dragGroup: "other" });
    await act(async () => {});

    const transfer = fakeTransfer();
    fire(draggableTab(left.container, "a1"), "dragstart", transfer);

    expect(fire(tabsetElement(right.container, "b"), "dragover", transfer).defaultPrevented).toBe(
      false,
    );
  });

  test("a tab id already in the target layout is refused", async () => {
    const left = mount("left", layoutWith("a", ["shared"]), { dragGroup: "desk" });
    const right = mount("right", layoutWith("b", ["shared", "b1"]), { dragGroup: "desk" });
    await act(async () => {});

    const transfer = fakeTransfer();
    fire(draggableTab(left.container, "shared"), "dragstart", transfer);

    expect(fire(tabsetElement(right.container, "b"), "dragover", transfer).defaultPrevented).toBe(
      false,
    );
  });

  test("a drop from another copy of the app lands and confirms over the channel", async () => {
    const right = mount("right", layoutWith("b", ["b1"]), { dragGroup: "desk" });
    await act(async () => {});

    const marker = {
      appId: "other-app",
      documentId: ":r0:",
      dragId: "drag-1",
      group: "desk",
      id: "far",
      kind: "tab",
      origin: location.origin,
      scope: "origin",
    };

    const transfer = fakeTransfer();

    const hex = [...new TextEncoder().encode(JSON.stringify(marker))]
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");

    transfer.setData(`${MARKER_PREFIX}${hex}`, "");
    transfer.setData(
      NODE_TYPE,
      JSON.stringify({ ...marker, node: tab("c", "Far", { id: "far" }) }),
    );

    const listener = new BroadcastChannel("dashfoo-drag");

    const accepted = new Promise((resolve) => {
      listener.addEventListener("message", (event) => {
        resolve(event.data);
      });
    });

    const target = tabsetElement(right.container, "b");
    fire(target, "dragover", transfer);
    act(() => {
      fire(target, "drop", transfer);
    });

    expect(findTab(right.latest(), "far")?.container.id).toBe("b");
    await expect(accepted).resolves.toEqual({ accepted: "drag-1" });
    listener.close();
  });

  test('scope "app" refuses drags from another copy of the app', async () => {
    const right = mount("right", layoutWith("b", ["b1"]), {
      dragGroup: "desk",
      dragGroupScope: "app",
    });

    await act(async () => {});

    const marker = {
      appId: "other-app",
      documentId: ":r0:",
      dragId: "drag-2",
      group: "desk",
      id: "far",
      kind: "tab",
      origin: location.origin,
      scope: "origin",
    };

    const transfer = fakeTransfer();

    const hex = [...new TextEncoder().encode(JSON.stringify(marker))]
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");

    transfer.setData(`${MARKER_PREFIX}${hex}`, "");

    expect(fire(tabsetElement(right.container, "b"), "dragover", transfer).defaultPrevented).toBe(
      false,
    );
  });
});

describe("tear-off", () => {
  test("a tab released outside the window is offered to onTearOff and removed on true", async () => {
    vi.useFakeTimers();
    const onTearOff = vi.fn<TearOffHandler>(() => true);
    const left = mount("left", layoutWith("a", ["a1", "a2"]), { dragGroup: "desk", onTearOff });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    const transfer = fakeTransfer();
    const source = draggableTab(left.container, "a2");
    fire(source, "dragstart", transfer);
    fire(source, "dragend", transfer, { screenX: -400, screenY: 200 });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(onTearOff).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "tab", nodeId: "a2", point: { x: -400, y: 200 } }),
    );
    const [request] = onTearOff.mock.calls.at(0) ?? [];
    assert(request);
    expect(collectTabsets(request.model).map((node) => node.children.map(({ id }) => id))).toEqual([
      ["a2"],
    ]);
    expect(findTab(left.latest(), "a2")).toBeUndefined();
    expect(left.changes.at(-1)).toEqual({ nodeId: "a2", type: "tearOff" });
  });

  test("returning false keeps the tab", async () => {
    vi.useFakeTimers();

    const left = mount("left", layoutWith("a", ["a1"]), {
      dragGroup: "desk",
      onTearOff: () => false,
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    const transfer = fakeTransfer();
    const source = draggableTab(left.container, "a1");
    fire(source, "dragstart", transfer);
    fire(source, "dragend", transfer, { screenX: -400, screenY: 200 });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(findTab(left.latest(), "a1")).toBeDefined();
    expect(left.changes).toEqual([]);
  });

  test("a release inside the window tears nothing off", async () => {
    vi.useFakeTimers();
    const onTearOff = vi.fn<TearOffHandler>(() => true);
    const left = mount("left", layoutWith("a", ["a1"]), { dragGroup: "desk", onTearOff });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });

    const transfer = fakeTransfer();
    const source = draggableTab(left.container, "a1");
    fire(source, "dragstart", transfer);
    fire(source, "dragend", transfer, { screenX: 10, screenY: 10 });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(300);
    });

    expect(onTearOff).not.toHaveBeenCalled();
  });
});

describe("pointer drags under a shared provider", () => {
  test("a commit in one layout of the group transfers a node from the other", async () => {
    const stores = new Map<string, LayoutStore>();

    const Probe = ({ name }: { name: string }): null => {
      const store = useContext(LayoutStoreContext);

      if (store) {
        stores.set(name, store);
      }

      return null;
    };

    const left = layoutWith("a", ["a1", "a2"]);
    const right = layoutWith("b", ["b1"]);
    let leftModel = left;

    const Side = ({ initial, name }: { initial: Dashfoo; name: string }) => {
      const store = useDashfooStore({
        defaultModel: initial,
        onModelChange: (next) => {
          if (name === "left") {
            leftModel = next;
          }
        },
      });

      return (
        <Layout.Root
          dispatch={store.dispatch}
          dragGroup="desk"
          model={store.model}
          renderers={{ tab: () => null }}
        >
          <Probe name={name} />
        </Layout.Root>
      );
    };

    render(
      <DashfooDragProvider>
        <Side initial={left} name="left" />
        <Side initial={right} name="right" />
      </DashfooDragProvider>,
    );
    await act(async () => {});

    const leftStore = stores.get("left");
    const rightStore = stores.get("right");
    assert(leftStore && rightStore);
    const subject = { documentId: leftStore.getState().documentId, id: "a1", kind: "tab" as const };
    const dispatch = vi.spyOn(rightStore.getState(), "dispatch");

    act(() => {
      createLayer("right-layer", rightStore).commit(
        { location: "center", sourceId: "a1", targetId: "b", type: "moveNode" },
        subject,
      );
    });

    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ node: expect.objectContaining({ id: "a1" }), type: "transferIn" }),
    );
    expect(findTab(leftModel, "a1")).toBeUndefined();
  });
});
