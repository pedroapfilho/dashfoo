import type { ReactNode } from "react";

const Row = ({ label, value }: { label: ReactNode; value: ReactNode }): ReactNode => (
  <div className="text-df-muted flex justify-between gap-4 text-xs">
    <span>{label}</span>
    <span className="text-df-text tabular-nums">{value}</span>
  </div>
);

export { Row };
