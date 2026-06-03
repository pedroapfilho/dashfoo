import type { ReactNode } from "react";

// Fully neutral gain/loss: direction reads through a glyph + weight, never hue.
const directionGlyph = (value: number): string => {
  if (value > 0) {
    return "▲";
  }
  if (value < 0) {
    return "▼";
  }
  return "–";
};

const directionLabel = (value: number): string => {
  if (value > 0) {
    return "up";
  }
  if (value < 0) {
    return "down";
  }
  return "flat";
};

const SignedValue = ({ display, value }: { display: string; value: number }): ReactNode => (
  <span className="text-df-text inline-flex items-center gap-1 font-medium tabular-nums">
    <span aria-hidden className="text-df-muted text-[9px]">
      {directionGlyph(value)}
    </span>
    <span className="sr-only">{directionLabel(value)} </span>
    {display}
  </span>
);

export { SignedValue };
