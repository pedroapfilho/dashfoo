/**
 * `instanceof Node` checks this window's constructors, so a node from a popup
 * rendered through a portal fails it. These guards hold in any window.
 */
const isNode = (value: unknown): value is Node =>
  typeof value === "object" &&
  value !== null &&
  "nodeType" in value &&
  typeof value.nodeType === "number";

const isElement = (value: unknown): value is Element =>
  isNode(value) && value.nodeType === Node.ELEMENT_NODE;

/** `offsetParent` sets an HTML element apart from an SVG or MathML one. */
const isHTMLElement = (value: unknown): value is HTMLElement =>
  isElement(value) && "offsetParent" in value;

export { isElement, isHTMLElement, isNode };
