/**
 * Lives in `lib/` rather than beside `normalize`, because both the parse
 * boundary (`tabsetNodeSchema`) and the tree walker that `normalize` uses need
 * it, and importing it from either one would close a module cycle.
 */
const clampSelected = (length: number, selected: number): number => {
  if (length === 0) {
    return 0;
  }

  const base = Number.isFinite(selected) ? Math.trunc(selected) : 0;
  if (base < 0) {
    return 0;
  }
  if (base > length - 1) {
    return length - 1;
  }
  return base;
};

export { clampSelected };
