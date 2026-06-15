import { ImageResponse } from "next/og";

// Shared social-card renderer for the OpenGraph and Twitter image routes.
// Satori (behind ImageResponse) only reads inline styles and needs an explicit
// display:flex on every element that has more than one child.
const ogSize = { height: 630, width: 1200 };
const ogContentType = "image/png";
const ogAlt = "dashfoo: headless React docking layout";

const renderOgImage = (): ImageResponse =>
  new ImageResponse(
    <div
      style={{
        backgroundColor: "#0a0a0b",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        justifyContent: "center",
        padding: "96px",
        width: "100%",
      }}
    >
      <div style={{ alignItems: "center", display: "flex", gap: 32 }}>
        <div style={{ display: "flex", gap: 16 }}>
          <div style={{ backgroundColor: "#fafafa", borderRadius: 14, height: 144, width: 64 }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ backgroundColor: "#8b8b8f", borderRadius: 14, height: 64, width: 64 }} />
            <div style={{ backgroundColor: "#8b8b8f", borderRadius: 14, height: 64, width: 64 }} />
          </div>
        </div>
        <div style={{ color: "#fafafa", fontSize: 108, fontWeight: 700, letterSpacing: "-0.04em" }}>
          dashfoo
        </div>
      </div>
      <div
        style={{
          color: "#a1a1aa",
          display: "flex",
          fontSize: 44,
          lineHeight: 1.3,
          marginTop: 48,
          maxWidth: 940,
        }}
      >
        Headless React docking layouts. Tabs, splits, drag-dock, and a serializable model, styled by
        you.
      </div>
    </div>,
    ogSize,
  );

export { ogAlt, ogContentType, ogSize, renderOgImage };
