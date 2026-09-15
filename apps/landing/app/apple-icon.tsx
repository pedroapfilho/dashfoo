import { ImageResponse } from "next/og";

const size = { height: 180, width: 180 };
const contentType = "image/png";
const COLORS = { background: "#0a0a0b", ink: "#fafafa", muted: "#8b8b8f" };
const AppleIcon = (): ImageResponse =>
  new ImageResponse(
    <svg height={180} viewBox="0 0 180 180" width={180}>
      <rect fill={COLORS.background} height={180} width={180} />
      <rect fill={COLORS.ink} height={108} rx={10} width={48} x={36} y={36} />
      <rect fill={COLORS.muted} height={48} rx={10} width={48} x={96} y={36} />
      <rect fill={COLORS.muted} height={48} rx={10} width={48} x={96} y={96} />
    </svg>,
    size,
  );
export { contentType, size };
export default AppleIcon;
