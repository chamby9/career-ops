import { ImageResponse } from "next/og";

export const size = { width: 192, height: 192 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 120,
          background: "#0a0a0a",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#ededed",
          fontWeight: 700,
          letterSpacing: "-0.05em",
          borderRadius: 38,
        }}
      >
        CO
      </div>
    ),
    { ...size }
  );
}
