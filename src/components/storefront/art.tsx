import * as React from "react";
import { cn } from "@/lib/utils";
import { ART_TINTS } from "./theme";

function hash(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Symmetric pixel sprite generated from a seed string (7×7, mirrored). */
export function PixelSprite({ seed, size = 56, className, fill = "#ffffff" }: { seed: string; size?: number; className?: string; fill?: string }) {
  const cells: { x: number; y: number; o: number }[] = [];
  let bits = hash(seed);
  for (let y = 0; y < 7; y++) {
    for (let x = 0; x < 4; x++) {
      bits = Math.imul(bits ^ (bits >>> 13), 0x5bd1e995) >>> 0;
      const v = bits % 7;
      if (v < 3) continue;
      const o = v === 6 ? 1 : v >= 5 ? 0.7 : 0.4;
      cells.push({ x, y, o });
      if (x !== 3) cells.push({ x: 6 - x, y, o });
    }
  }
  return (
    <svg viewBox="0 0 7 7" width={size} height={size} shapeRendering="crispEdges" className={className} aria-hidden>
      {cells.map((c, i) => (
        <rect key={i} x={c.x} y={c.y} width={1} height={1} fill={fill} opacity={c.o} />
      ))}
    </svg>
  );
}

const KIND_LABEL: Record<string, string> = {
  rank: "Привилегия",
  subscription: "Подписка",
  case: "Кейс",
  currency: "Валюта",
  kit: "Набор",
  unban: "Разбан",
  cosmetic: "Косметика",
  pool: "Складчина",
};

/** Generated product art: brand-tinted tile, engineering grid, sprite and glyph. */
export function ProductArt({
  id,
  glyph,
  tint,
  kind,
  className,
  size = "lg",
}: {
  id: string;
  glyph: string;
  tint: number;
  kind?: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  return (
    <div
      className={cn(
        "relative isolate flex shrink-0 overflow-hidden rounded-(--st-r-art,10px) bg-gradient-to-br ring-1 ring-white/10 ring-inset",
        ART_TINTS[tint % ART_TINTS.length],
        size === "sm" && "size-10 items-center justify-center",
        size === "md" && "size-16 items-center justify-center",
        size === "lg" && "h-28 w-full items-end p-3",
        className,
      )}
      aria-hidden
    >
      <div className="absolute inset-0 -z-10 bg-grid-sm opacity-80" />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_bottom,rgb(255_255_255/0.14),transparent_40%)]" />
      {size === "lg" ? (
        <>
          <PixelSprite seed={id} size={64} className="absolute top-3 right-3 opacity-35 mix-blend-overlay" />
          {kind ? <span className="label-mono absolute top-3 left-3 text-[9.5px] text-white/70">{KIND_LABEL[kind]}</span> : null}
          <span className="font-display text-[34px] leading-none font-semibold tracking-[-0.05em] text-white drop-shadow-[0_2px_8px_rgb(0_0_0/0.35)]">
            {glyph}
          </span>
        </>
      ) : (
        <span
          className={cn(
            "font-display leading-none font-semibold tracking-[-0.05em] text-white",
            size === "sm" ? (glyph.length > 2 ? "text-[11px]" : "text-sm") : glyph.length > 2 ? "text-base" : "text-xl",
          )}
        >
          {glyph}
        </span>
      )}
    </div>
  );
}

/** Generated project logo: an isometric "ice block" with the project initial. */
export function StoreLogo({ name, size = 36, className }: { name: string; size?: number; className?: string }) {
  const id = React.useId();
  const initial = name.trim().charAt(0).toUpperCase() || "A";
  return (
    <span className={cn("relative inline-flex shrink-0", className)} style={{ width: size, height: size }} aria-hidden>
      <svg viewBox="0 0 36 36" width={size} height={size}>
        <defs>
          <linearGradient id={`${id}-a`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#86e0ff" />
            <stop offset="1" stopColor="#215fed" />
          </linearGradient>
          <linearGradient id={`${id}-b`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1b4cc4" />
            <stop offset="1" stopColor="#0d1a3d" />
          </linearGradient>
        </defs>
        <rect x="0.5" y="0.5" width="35" height="35" rx="8" fill={`url(#${id}-b)`} stroke="rgb(148 166 204 / 0.25)" />
        <path d="M18 6 29 12.2 18 18.4 7 12.2Z" fill="#edf1f8" opacity="0.95" />
        <path d="M7 12.2 18 18.4V30L7 23.8Z" fill={`url(#${id}-a)`} opacity="0.9" />
        <path d="M29 12.2 18 18.4V30l11-6.2Z" fill="#3377ff" opacity="0.85" />
        <rect x="11" y="27" width="2" height="2" fill="#b5ecff" opacity="0.7" />
        <rect x="24" y="8" width="2" height="2" fill="#ffffff" opacity="0.6" />
      </svg>
      <span className="absolute inset-x-0 top-[5px] text-center font-display text-[11px] font-bold text-azure-900" style={{ fontSize: size * 0.3 }}>
        {initial}
      </span>
    </span>
  );
}
