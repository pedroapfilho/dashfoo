import type { Dashfoo, SnapConfig } from "@dashfoo/core";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, test } from "vitest";

import { useLayout } from "../hooks/layout-store";

import { Layout } from "./layout";

const model = (snap?: SnapConfig): Dashfoo => ({
  activeTabsetId: "ts1",
  global: snap === undefined ? {} : { snap },
  layout: {
    children: [{ children: [], id: "ts1", selected: 0, type: "tabset" }],
    id: "root",
    orientation: "row",
    type: "row",
  },
  version: 1,
});

const SnapProbe = (): ReactNode => {
  const snap = useLayout((state) => state.snap);
  return <span data-testid="snap">{JSON.stringify(snap)}</span>;
};

const resolvedSnap = (props: { model: Dashfoo; snap?: SnapConfig }): unknown => {
  render(
    <Layout.Root dispatch={() => {}} model={props.model} renderTab={() => null} snap={props.snap}>
      <SnapProbe />
    </Layout.Root>,
  );
  return JSON.parse(screen.getByTestId("snap").textContent ?? "null");
};

describe("LayoutRoot snap resolution", () => {
  test("is null when neither prop nor global config is set", () => {
    expect(resolvedSnap({ model: model() })).toBeNull();
  });

  test("uses the prop when given", () => {
    expect(resolvedSnap({ model: model(), snap: { step: 25 } })).toEqual({ step: 25 });
  });

  test("falls back to model.global.snap when no prop is given", () => {
    expect(resolvedSnap({ model: model({ step: 10, threshold: 3 }) })).toEqual({
      step: 10,
      threshold: 3,
    });
  });

  test("the prop replaces model.global.snap when both are present", () => {
    expect(resolvedSnap({ model: model({ step: 10 }), snap: { step: 50 } })).toEqual({ step: 50 });
  });
});
