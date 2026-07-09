const fallbackSelectedIndex = (count: number, removedIndex: number): number =>
  removedIndex + 1 < count ? removedIndex + 1 : removedIndex - 1;

export { fallbackSelectedIndex };
