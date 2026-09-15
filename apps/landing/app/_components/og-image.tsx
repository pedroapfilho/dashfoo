import { svgText } from "@repo/social-image";
import { ImageResponse } from "next/og";

const ogSize = { height: 630, width: 1200 };
const ogContentType = "image/png";
const ogAlt = "dashfoo: headless React docking layout";
const COLORS = { background: "#0a0a0b", ink: "#fafafa", mark: "#8b8b8f", muted: "#a1a1aa" };
const renderOgImage = (): ImageResponse =>
  new ImageResponse(
    <svg height={630} viewBox="0 0 1200 630" width={1200}>
      <rect fill={COLORS.background} height={630} width={1200} />
      <rect fill={COLORS.ink} height={144} rx={14} width={64} x={96} y={161} />
      <rect fill={COLORS.mark} height={64} rx={14} width={64} x={176} y={161} />
      <rect fill={COLORS.mark} height={64} rx={14} width={64} x={176} y={241} />
      {svgText("dashfoo", { color: COLORS.ink, size: 108, tracking: -4.32, x: 272, y: 270 })}
      {svgText(
        "Headless React docking layouts. Tabs, splits, drag-dock, and a serializable model, styled by you.",
        { color: COLORS.muted, lineHeight: 1.3, size: 44, width: 940, x: 96, y: 395 },
      )}
    </svg>,
    ogSize,
  );
export { ogAlt, ogContentType, ogSize, renderOgImage };
