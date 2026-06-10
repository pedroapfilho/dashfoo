// The neighbour to show as active when the selected tab is dragged out: the next
// tab if there is one, else the previous, else -1 (the tabset is emptying).
const fallbackSelectedIndex = (count: number, removedIndex: number): number =>
  removedIndex + 1 < count ? removedIndex + 1 : removedIndex - 1;

export { fallbackSelectedIndex };
