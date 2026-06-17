import type { SnapConfig } from "../model/schema";

// Magnetic snapping for split resize. Pure math over ordered percentage arrays
// (sizes sum to ~100) so the engine stays framework-free; the React adapter maps
// rrp's id-keyed layout to/from these arrays. The dragged boundary index is passed
// in rather than inferred, so a cascading min-size resize can't fool the snap onto
// the wrong boundary.

const DEFAULT_SNAP_THRESHOLD = 4;
// Round grid positions so equal targets from different sources (step 25 vs
// divisions 4) dedupe and float drift (100/3) compares cleanly.
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

// The grid the boundary can snap to: the union of the fixed `step` grid and the
// even-`divisions` grid (multiples of 100/d, where d is the number or, for
// "panels", the row's panel count). Positions strictly inside 0..100.
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

// Whether a config produces any snap grid at all — used to gate the resize
// listeners so a non-snapping layout pays nothing per pointer move.
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

// Snap the dragged boundary (between panel `boundaryIndex` and the next) to the
// nearest grid target within the threshold, moving only that pair so siblings keep
// their sizes. Returns the input unchanged when snapping is off, nothing is within
// reach, the index is out of range, or the correction would drive a panel negative
// (rrp re-clamps real px minimums on the next frame).
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

export { DEFAULT_SNAP_THRESHOLD, resolveSnapTargets, snapEnabled, snapSizes };
export type { SnapResult };
