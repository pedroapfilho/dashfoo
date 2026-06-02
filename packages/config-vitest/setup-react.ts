import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// jsdom has no ResizeObserver; component libraries that measure (e.g.
// react-resizable-panels) need it present to render in tests.
vi.stubGlobal(
  "ResizeObserver",
  class {
    disconnect = vi.fn();
    observe = vi.fn();
    unobserve = vi.fn();
  },
);

afterEach(() => {
  cleanup();
});
