import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const alt = "PayMC — донат, который доходит";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const font = (pkg: string, file: string) => readFile(join(process.cwd(), "node_modules/@fontsource", pkg, "files", file));

const STEPS: [string, string][] = [
  ["Платёж подтверждён · СБП", "0 мс"],
  ["Вебхук принят, подпись верна", "+38 мс"],
  ["Агент получил задание", "+61 мс"],
  ["lp user kotik228 parent addtemp frost", "+14 мс"],
  ["Сервер подтвердил выдачу", "+7 мс"],
];

export default async function Image() {
  const [geoCyr, geoLat, onestCyr, onestLat, monoCyr, monoLat] = await Promise.all([
    font("geologica", "geologica-cyrillic-500-normal.woff"),
    font("geologica", "geologica-latin-500-normal.woff"),
    font("onest", "onest-cyrillic-500-normal.woff"),
    font("onest", "onest-latin-500-normal.woff"),
    font("jetbrains-mono", "jetbrains-mono-cyrillic-500-normal.woff"),
    font("jetbrains-mono", "jetbrains-mono-latin-500-normal.woff"),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#05070b",
          color: "#edf1f8",
          padding: "64px 72px",
          fontFamily: "OnestLat, OnestCyr",
          position: "relative",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 600 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <svg width="40" height="40" viewBox="0 0 24 24">
              <path d="M12 1.6 21.2 6.9 12 12.2 2.8 6.9 12 1.6Z" fill="#edf1f8" />
              <path d="M2.8 6.9 12 12.2v10.2L2.8 17.1V6.9Z" fill="#3377ff" />
              <path d="M21.2 6.9 12 12.2v10.2l9.2-5.3V6.9Z" fill="#1b4cc4" />
              <path d="M9.1 5.6 14.9 8.2" stroke="#0a0d14" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <div style={{ display: "flex", fontSize: 32, fontFamily: "GeoLat, GeoCyr", letterSpacing: "-0.03em" }}>
              Pay<span style={{ color: "#8cb9ff" }}>MC</span>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", flexDirection: "column", fontFamily: "GeoLat, GeoCyr", fontSize: 76, lineHeight: 1, letterSpacing: "-0.04em" }}>
              <span>Донат, который</span>
              <span style={{ color: "#7c889d" }}>доходит</span>
            </div>
            <div style={{ display: "flex", marginTop: 28, fontSize: 25, lineHeight: 1.4, color: "#b2bccd", maxWidth: 560 }}>
              Магазин для серверов Minecraft, Rust, GTA RP и ARK. Выдача в игре меньше чем за секунду, выплаты каждый день.
            </div>
          </div>
          <div style={{ display: "flex", gap: 28, fontFamily: "MonoLat, MonoCyr", fontSize: 19, color: "#7c889d" }}>
            <span>4,9 % — всё включено</span>
            <span>12:00 — выплата</span>
            <span>16 игр</span>
          </div>
        </div>
        <div style={{ display: "flex", flex: 1, alignItems: "center", justifyContent: "flex-end" }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: 470,
              borderRadius: 16,
              border: "1px solid rgba(148,166,204,0.2)",
              background: "#0a0d14",
              padding: "22px 24px",
              boxShadow: "0 30px 80px -30px rgba(0,0,0,0.9)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "MonoLat, MonoCyr", fontSize: 15, color: "#68748a" }}>
              <span>Трасса заказа</span>
              <span style={{ color: "#3fd18f" }}>выдано за 120 мс</span>
            </div>
            {STEPS.map(([title, ms], i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", marginTop: 18, gap: 14 }}>
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 9,
                    background: "rgba(63,209,143,0.14)",
                    border: "1px solid rgba(63,209,143,0.4)",
                    display: "flex",
                  }}
                />
                <div
                  style={{
                    display: "flex",
                    flex: 1,
                    fontSize: i === 3 ? 15 : 18,
                    fontFamily: i === 3 ? "MonoLat, MonoCyr" : "OnestLat, OnestCyr",
                    color: i === 3 ? "#86e0ff" : "#edf1f8",
                  }}
                >
                  {title}
                </div>
                <div style={{ display: "flex", fontFamily: "MonoLat, MonoCyr", fontSize: 15, color: "#68748a" }}>{ms}</div>
              </div>
            ))}
            <div
              style={{
                display: "flex",
                marginTop: 22,
                padding: "12px 14px",
                borderRadius: 10,
                background: "#06080c",
                fontFamily: "MonoLat, MonoCyr",
                fontSize: 15,
                color: "#b2bccd",
              }}
            >
              <div style={{ display: "flex", gap: 10 }}>
                <span style={{ color: "#55cfff" }}>[ArcticMC]</span>
                <span>kotik228 получил Frost — спасибо!</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "GeoCyr", data: geoCyr, weight: 500, style: "normal" },
        { name: "GeoLat", data: geoLat, weight: 500, style: "normal" },
        { name: "OnestCyr", data: onestCyr, weight: 500, style: "normal" },
        { name: "OnestLat", data: onestLat, weight: 500, style: "normal" },
        { name: "MonoCyr", data: monoCyr, weight: 500, style: "normal" },
        { name: "MonoLat", data: monoLat, weight: 500, style: "normal" },
      ],
    },
  );
}
