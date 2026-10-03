import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { HOST } from "@/lib/constants";

export const alt = `${HOST.name}, ${HOST.headline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const photo = await readFile(join(process.cwd(), "public", HOST.photo));
  const photoSrc = `data:image/jpeg;base64,${photo.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          gap: 56,
          padding: 80,
          background: "linear-gradient(135deg, #eef2ff 0%, #ffffff 55%, #ecfeff 100%)",
          color: "#0f172a",
          fontFamily: "sans-serif",
        }}
      >
        <img
          src={photoSrc}
          alt=""
          width={280}
          height={280}
          style={{ borderRadius: 999, border: "8px solid #ffffff", boxShadow: "0 12px 32px rgba(79, 70, 229, 0.35)" }}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: "#4f46e5", letterSpacing: 2 }}>HI, I&apos;M</div>
          <div style={{ fontSize: 76, fontWeight: 800, letterSpacing: -2 }}>{HOST.name}</div>
          <div style={{ fontSize: 36, color: "#334155" }}>{HOST.headline}</div>
          <div style={{ fontSize: 26, color: "#64748b", marginTop: 12 }}>Host · UTP CodeFest BFF Workshop</div>
        </div>
      </div>
    ),
    size,
  );
}
