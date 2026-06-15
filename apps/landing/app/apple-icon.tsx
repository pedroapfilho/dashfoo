import { ImageResponse } from "next/og";

// Apple touch icons must be raster (PNG), so the dashfoo mark is drawn with divs
// and rendered to PNG instead of reusing icon.svg. iOS adds its own rounded mask
// over the opaque tile.
export const size = { height: 180, width: 180 };
export const contentType = "image/png";

const AppleIcon = (): ImageResponse =>
  new ImageResponse(
    <div
      style={{
        alignItems: "center",
        backgroundColor: "#0a0a0b",
        display: "flex",
        height: "100%",
        justifyContent: "center",
        width: "100%",
      }}
    >
      <div style={{ display: "flex", gap: 12 }}>
        <div style={{ backgroundColor: "#fafafa", borderRadius: 10, height: 108, width: 48 }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ backgroundColor: "#8b8b8f", borderRadius: 10, height: 48, width: 48 }} />
          <div style={{ backgroundColor: "#8b8b8f", borderRadius: 10, height: 48, width: 48 }} />
        </div>
      </div>
    </div>,
    size,
  );

export default AppleIcon;
