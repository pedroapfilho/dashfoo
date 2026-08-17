/** In `lib/` because both the parse boundary and `normalize` need it, and
 * importing it from either would close a module cycle. */
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
