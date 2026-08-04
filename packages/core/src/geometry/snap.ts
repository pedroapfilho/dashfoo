import type { SnapConfig } from "../model/schema";

const DEFAULT_SNAP_THRESHOLD = 4;

const TARGET_PRECISION = 1e6;

const addMultiples = (targets: Set<number>, increment: number): void => {
  if (increment <= 0) {
    return;
  }
  for (let position = increment; position < 100; position += increment) {
    const rounded = Math.round(position * TARGET_PRECISION) / TARGET_PRECISION;
    if (rounded < 100) {
      targets.add(rounded);
    }
  }
};

const resolveSnapTargets = (config: SnapConfig, panelCount: number): Array<number> => {
  const targets = new Set<number>();
  if (config.step !== undefined && config.step > 0) {
    addMultiples(targets, config.step);
  }
  if (config.divisions !== undefined) {
    const divisions = config.divisions === "panels" ? panelCount : config.divisions;
    if (divisions >= 2) {
      addMultiples(targets, 100 / divisions);
    }
  }
  return [...targets].toSorted((a, b) => a - b);
};

const snapEnabled = (config: SnapConfig | null): boolean =>
  config !== null &&
  ((config.step ?? 0) > 0 ||
    config.divisions === "panels" ||
    (typeof config.divisions === "number" && config.divisions >= 2));

const nearestTarget = (position: number, targets: Array<number>): number | undefined =>
  targets.reduce<number | undefined>((best, target) => {
    if (best === undefined || Math.abs(target - position) < Math.abs(best - position)) {
      return target;
    }
    return best;
  }, undefined);

type SnapResult = { sizes: Array<number>; snapped: boolean };

const snapSizes = (sizes: Array<number>, boundaryIndex: number, config: SnapConfig): SnapResult => {
  const threshold = config.threshold ?? DEFAULT_SNAP_THRESHOLD;
  const left = sizes[boundaryIndex];
  const right = sizes[boundaryIndex + 1];
  if (boundaryIndex < 0 || left === undefined || right === undefined) {
    return { sizes, snapped: false };
  }

  const targets = resolveSnapTargets(config, sizes.length);
  if (targets.length === 0) {
    return { sizes, snapped: false };
  }

  let position = 0;
  for (let index = 0; index <= boundaryIndex; index++) {
    position += sizes[index] ?? 0;
  }

  const target = nearestTarget(position, targets);
  if (target === undefined || Math.abs(target - position) > threshold) {
    return { sizes, snapped: false };
  }

  const delta = target - position;
  if (left + delta < 0 || right - delta < 0) {
    return { sizes, snapped: false };
  }

  const next = [...sizes];
  next[boundaryIndex] = left + delta;
  next[boundaryIndex + 1] = right - delta;
  return { sizes: next, snapped: true };
};

type SnapDecision =
  | { kind: "inactive" }
  | { kind: "clear" }
  | { kind: "engage"; sizes: Array<number> };

const decideSnap = (
  sizes: Array<number>,
  boundaryIndex: number | null,
  config: SnapConfig | null,
): SnapDecision => {
  if (boundaryIndex === null || config === null || !snapEnabled(config)) {
    return { kind: "inactive" };
  }
  const { sizes: snappedSizes, snapped } = snapSizes(sizes, boundaryIndex, config);
  return snapped ? { kind: "engage", sizes: snappedSizes } : { kind: "clear" };
};

const settleSnap = (
  sizes: Array<number>,
  boundaryIndex: number | null,
  config: SnapConfig | null,
): Array<number> => {
  const decision = decideSnap(sizes, boundaryIndex, config);
  return decision.kind === "engage" ? decision.sizes : sizes;
};

export {
  DEFAULT_SNAP_THRESHOLD,
  decideSnap,
  resolveSnapTargets,
  settleSnap,
  snapEnabled,
  snapSizes,
};
export type { SnapDecision, SnapResult };
