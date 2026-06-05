import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { Panel } from "./panel";

describe("Panel", () => {
  test("renders the title and body content in the headless structure", () => {
    const { container } = render(<Panel title="Order Book">rows</Panel>);
    expect(container.querySelector('[data-dashfoo="panel"]')).not.toBeNull();
    expect(container.querySelector('[data-dashfoo="panel-header"]')).not.toBeNull();
    expect(screen.getByText("Order Book")).toBeInTheDocument();
    const body = container.querySelector('[data-dashfoo="panel-body"]');
    expect(body?.textContent).toBe("rows");
  });

  test("renders the icon slot only when an icon is provided", () => {
    const { container, rerender } = render(<Panel title="Chart">x</Panel>);
    expect(container.querySelector('[data-dashfoo="panel-icon"]')).toBeNull();
    rerender(
      <Panel icon={<svg data-testid="ic" />} title="Chart">
        x
      </Panel>,
    );
    const icon = container.querySelector('[data-dashfoo="panel-icon"]');
    expect(icon).not.toBeNull();
    expect(icon?.querySelector('[data-testid="ic"]')).not.toBeNull();
  });

  test("renders the live badge only when live is set", () => {
    const { container, rerender } = render(<Panel title="Chart">x</Panel>);
    expect(container.querySelector('[data-dashfoo="panel-badge"]')).toBeNull();
    rerender(
      <Panel live title="Chart">
        x
      </Panel>,
    );
    expect(container.querySelector('[data-dashfoo="panel-badge"]')).not.toBeNull();
  });
});
