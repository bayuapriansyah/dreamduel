import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", background: "#ff6a2b", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", color: "#160a04", fontSize: 40, fontWeight: 800 }}>
        D
      </div>
    ),
    size,
  );
}
