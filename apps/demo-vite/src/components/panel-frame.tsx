import { Radio } from "lucide-react";
import type { ReactNode } from "react";

// The shared chrome for a panel's content: a titled header (optional leading icon
// + LIVE badge) over a scrolling body. Neutral throughout — icons inherit
// currentColor, so no hue leaks into the grayscale theme.
const PanelFrame = ({
  children,
  icon,
  live = false,
  title,
}: {
  children: ReactNode;
  icon?: ReactNode;
  live?: boolean;
  title: string;
}): ReactNode => (
  <div className="flex h-full flex-col">
    <div className="border-df-border flex items-center justify-between gap-2 border-b px-3.5 py-2.5">
      <span className="text-df-text flex items-center gap-2 text-xs font-semibold tracking-wide">
        {icon ? <span className="text-df-faint flex items-center">{icon}</span> : null}
        {title}
      </span>
      {live ? (
        <span className="text-df-muted flex items-center gap-1 rounded-full bg-white/5 px-1.5 py-0.5 text-[10px] tracking-wider uppercase">
          <Radio size={10} />
          live
        </span>
      ) : null}
    </div>
    <div className="min-h-0 flex-1 overflow-auto p-3.5">{children}</div>
  </div>
);

export { PanelFrame };
