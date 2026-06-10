import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { Panel } from "./panel";

describe("Panel", () => {
  test("renders the full composed headless structure", () => {
    const { container } = render(
      <Panel.Root>
        <Panel.Header>
          <Panel.Icon>
            <svg data-testid="ic" />
          </Panel.Icon>
          <Panel.Title>Order Book</Panel.Title>
          <Panel.Badge>Live</Panel.Badge>
        </Panel.Header>
        <Panel.Body>rows</Panel.Body>
      </Panel.Root>,
    );

    expect(container.querySelector('[data-dashfoo="panel"]')).not.toBeNull();
    expect(container.querySelector('[data-dashfoo="panel-header"]')).not.toBeNull();
    expect(
      container.querySelector('[data-dashfoo="panel-icon"] [data-testid="ic"]'),
    ).not.toBeNull();
    expect(container.querySelector('[data-dashfoo="panel-badge"]')?.textContent).toBe("Live");
    expect(screen.getByText("Order Book")).toBeInTheDocument();
    const body = container.querySelector('[data-dashfoo="panel-body"]');
    expect(body?.textContent).toBe("rows");
  });

  test("renders icon and badge only when composed", () => {
    const { container } = render(
      <Panel.Root>
        <Panel.Header>
          <Panel.Title>Chart</Panel.Title>
        </Panel.Header>
        <Panel.Body>x</Panel.Body>
      </Panel.Root>,
    );

    expect(container.querySelector('[data-dashfoo="panel-icon"]')).toBeNull();
    expect(container.querySelector('[data-dashfoo="panel-badge"]')).toBeNull();
  });

  test("renders arbitrary badge children", () => {
    const { container } = render(
      <Panel.Root>
        <Panel.Header>
          <Panel.Title>Chart</Panel.Title>
          <Panel.Badge>
            <strong>2 alerts</strong>
          </Panel.Badge>
        </Panel.Header>
      </Panel.Root>,
    );

    expect(container.querySelector('[data-dashfoo="panel-badge"] strong')?.textContent).toBe(
      "2 alerts",
    );
  });

  test("spreads rest props while pinning data-dashfoo", () => {
    const { container } = render(
      <Panel.Root className="shell" data-dashfoo="wrong" id="orders">
        <Panel.Body className="body" data-dashfoo="wrong-body" id="orders-body">
          rows
        </Panel.Body>
      </Panel.Root>,
    );

    const root = container.querySelector("#orders");
    expect(root).toHaveAttribute("class", "shell");
    expect(root).toHaveAttribute("data-dashfoo", "panel");
    const body = container.querySelector("#orders-body");
    expect(body).toHaveAttribute("class", "body");
    expect(body).toHaveAttribute("data-dashfoo", "panel-body");
  });
});
