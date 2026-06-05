import { Panel } from "@dashfoo/react";
import { LineChart } from "lucide-react";
import type { ReactNode } from "react";

import { useChartSeries } from "../data/feed";

import type { PanelProps } from "./panel-types";

const ChartPanel = ({ node }: PanelProps): ReactNode => {
  const series = useChartSeries();
  const last = series.length - 1;
  const line = series.map((v, i) => `${(i / last) * 100},${40 - (v / 100) * 40}`).join(" ");
  return (
    <Panel icon={<LineChart size={14} />} live title={node.name}>
      <svg className="h-full min-h-32 w-full" preserveAspectRatio="none" viewBox="0 0 100 40">
        <polygon fill="rgba(255,255,255,0.05)" points={`0,40 ${line} 100,40`} />
        <polyline fill="none" points={line} stroke="rgba(255,255,255,0.55)" strokeWidth="0.5" />
      </svg>
    </Panel>
  );
};

export { ChartPanel };
