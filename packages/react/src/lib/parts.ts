/** The parts the library both renders and looks up. A part only CSS targets stays a literal on its element. */
const PART = {
  floatOverlay: "float-overlay",
  layout: "layout",
  row: "row",
  splitter: "splitter",
  tab: "tab",
  tabItem: "tab-item",
  tabset: "tabset",
  tabstrip: "tabstrip",
} as const;

type Part = (typeof PART)[keyof typeof PART];

const selectorOf = (part: Part): string => `[data-dashfoo="${part}"]`;

const closestPart = (element: Element, part: Part): HTMLElement | null =>
  element.closest<HTMLElement>(selectorOf(part));

const partsIn = (scope: Element, part: Part): Array<HTMLElement> => [
  ...scope.querySelectorAll<HTMLElement>(selectorOf(part)),
];

const childParts = (parent: Element, part: Part): Array<HTMLElement> => [
  ...parent.querySelectorAll<HTMLElement>(`:scope > ${selectorOf(part)}`),
];

/** A layout nested in a tab holds the same parts, so `owner`'s own is the one whose nearest `ownerPart` is `owner`. */
const ownPart = (owner: Element, ownerPart: Part, part: Part): HTMLElement | undefined =>
  partsIn(owner, part).find((candidate) => closestPart(candidate, ownerPart) === owner);

export { childParts, closestPart, ownPart, PART, partsIn };
