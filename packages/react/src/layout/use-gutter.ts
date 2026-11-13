"use client";

import { createContext, useContext, useLayoutEffect, useMemo, useState } from "react";

import { cssPixels } from "../lib/css-pixels";
import { childParts, PART } from "../lib/parts";

/** The layout pixels one boundary between siblings takes: its splitter plus the row's CSS `gap` on each side. */
const measureGutter = (group: HTMLElement, horizontal: boolean): number | undefined => {
  const splitters = childParts(group, PART.splitter);

  if (splitters.length === 0) {
    return undefined;
  }

  const style = getComputedStyle(group);
  const gap = cssPixels(horizontal ? style.columnGap : style.rowGap);

  const thickness = splitters.reduce(
    (sum, splitter) => sum + (horizontal ? splitter.offsetWidth : splitter.offsetHeight),
    0,
  );

  return thickness / splitters.length + 2 * gap;
};

type Gutter = { report: (gutter: number) => void; size: number };

/**
 * One gutter per layout: every row is styled by the same splitter and gap rules,
 * and a parent needs its nested rows' gutters before they can measure.
 */
const GutterContext = createContext<Gutter>({ report: () => {}, size: 0 });

const useGutterRoot = (): Gutter => {
  const [size, setSize] = useState(0);

  return useMemo(() => ({ report: setSize, size }), [size]);
};

type RowGutter = { groupRef: (element: HTMLDivElement | null) => void; gutter: number };

/** Measures the row whose element lands in `groupRef`, and returns the layout's gutter. */
const useGutter = (horizontal: boolean, panelCount: number): RowGutter => {
  const { report, size } = useContext(GutterContext);
  const [group, setGroup] = useState<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    if (!group || panelCount < 2) {
      return undefined;
    }

    const measure = (): void => {
      const measured = measureGutter(group, horizontal);

      if (measured !== undefined) {
        report(measured);
      }
    };

    measure();
    const observer = new ResizeObserver(measure);

    for (const splitter of childParts(group, PART.splitter)) {
      observer.observe(splitter);
    }

    return () => {
      observer.disconnect();
    };
  }, [group, horizontal, panelCount, report]);

  return { groupRef: setGroup, gutter: size };
};

export { GutterContext, measureGutter, useGutter, useGutterRoot };
