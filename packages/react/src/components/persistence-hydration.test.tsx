import { model, row, tab, tabset, toJSON } from "@dashfoo/core";
import { act } from "@testing-library/react";
import { createRef, StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { expect, test, vi } from "vitest";

import { memoryStorageAdapter } from "../hooks/persistence";

import type { DashfooHandle } from "./dashfoo-layout";
import { DashfooLayout } from "./dashfoo-layout";

test("hydrates the seed before restoring storage once, without saving or recording history", async () => {
  const seed = model(row([tabset([tab("chart", "Original")], { id: "main" })], { id: "root" }));
  const storage = memoryStorageAdapter();
  const ref = createRef<DashfooHandle>();
  const onModelChange = vi.fn<() => void>();
  const view = (
    <StrictMode>
      <DashfooLayout
        defaultModel={seed}
        factory={(node) => <p>{node.name} content</p>}
        onModelChange={onModelChange}
        persist={{ key: "hydration", storage }}
        ref={ref}
      />
    </StrictMode>
  );
  const container = document.createElement("div");
  container.innerHTML = renderToString(view);
  document.body.append(container);
  const saved = toJSON(seed).replace("Original", "Restored");
  storage.setItem("hydration", saved);
  const write = vi.spyOn(storage, "setItem");
  const read = vi.spyOn(storage, "getItem");
  const onRecoverableError = vi.fn<() => void>();
  const root = hydrateRoot(container, view, { onRecoverableError });
  await act(async () => {});

  expect(onRecoverableError).not.toHaveBeenCalled();
  expect(container.textContent).toContain("Restored content");
  expect(read).toHaveBeenCalledTimes(1);
  expect(write).not.toHaveBeenCalled();
  expect(onModelChange).not.toHaveBeenCalled();
  expect(ref.current?.canUndo()).toBe(false);
  act(() => ref.current?.resetLayout());
  expect(container.textContent).toContain("Original content");
  expect(storage.getItem("hydration")).toBeNull();
  act(() => {
    root.unmount();
  });
  container.remove();
});
