import type { FloatNode } from "../model/schema";

const uniqueFloatName = (base: string, floats: Array<FloatNode>): string => {
  const used = new Set(floats.map((float) => float.name));
  if (!used.has(base)) {
    return base;
  }
  let index = 1;
  while (used.has(`${base} ${index}`)) {
    index += 1;
  }
  return `${base} ${index}`;
};

export { uniqueFloatName };
