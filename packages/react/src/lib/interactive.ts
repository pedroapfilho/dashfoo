import { isElement } from "./dom";

const INTERACTIVE_SELECTOR = `
  input:not([disabled]),
  select:not([disabled]),
  textarea:not([disabled]),
  button:not([disabled]),
  a[href],
  [contenteditable]:not([contenteditable="false"])
`;

/** A press on a control inside a drag handle operates the control, not the handle. */
const startsOnControl = (
  target: EventTarget | null,
  handle: Element | null | undefined,
): boolean => {
  if (!isElement(target)) {
    return false;
  }

  const control = target.closest(INTERACTIVE_SELECTOR);

  return control !== null && control !== handle;
};

export { startsOnControl };
