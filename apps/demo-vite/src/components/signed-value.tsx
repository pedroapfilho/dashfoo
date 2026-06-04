import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import type { ReactNode } from "react";

// Fully neutral gain/loss: direction reads through an icon + weight, never hue.
// Returns the element (not a component) so it renders as static JSX.
const directionIcon = (value: number): ReactNode => {
  if (value > 0) {
    return <TrendingUp aria-hidden className="text-df-muted" size={11} />;
  }
  if (value < 0) {
    return <TrendingDown aria-hidden className="text-df-muted" size={11} />;
  }
  return <Minus aria-hidden className="text-df-muted" size={11} />;
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
    {directionIcon(value)}
    <span className="sr-only">{directionLabel(value)} </span>
    {display}
  </span>
);

export { SignedValue };
