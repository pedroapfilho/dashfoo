/** A computed CSS length in pixels; keywords such as `normal` count as 0. */
const cssPixels = (value: string): number => Number(value.replace(/px$/v, "")) || 0;

export { cssPixels };
