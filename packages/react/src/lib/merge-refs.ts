import type { Ref } from "react";

const applyRef = <T>(ref: Ref<T> | undefined, value: T | null): void => {
  if (typeof ref === "function") {
    ref(value);
  } else if (ref) {
    ref.current = value;
  }
};

const mergeRefs =
  <T>(...refs: Array<Ref<T> | undefined>) =>
  (value: T | null): void => {
    for (const ref of refs) {
      applyRef(ref, value);
    }
  };

export { mergeRefs };
