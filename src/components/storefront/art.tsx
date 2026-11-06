import * as React from "react";
import { cn } from "@/lib/utils";
import type { StoreProduct } from "./types";

/* ───────────── Pixel pictograms ─────────────
 * Hand-drawn bitmaps: "#" — solid pixel, "+" — half-tone pixel, "." — empty.
 * They read as the item itself (crown, chest, key, fox…) instead of a monogram.
 */

const BITMAPS = {
  crown: ["#...#...#", "##.###.##", "#########", "#+##+##+#", "#########"],
  chest: [".#######.", "#+++++++#", "#########", "#+++#+++#", "#+++#+++#", "#+++++++#", "#########"],
  gem: [".#######.", "#+#+#+#+#", "#########", ".#+++++#.", "..#+++#..", "...#+#...", "....#...."],
  key: [".###.", "#...#", "#...#", "#...#", ".###.", "..#..", "..###", "..#..", "..##."],
  snowflake: ["....#....", ".#..#..#.", "..#.#.#..", "...###...", "#########", "...###...", "..#.#.#..", ".#..#..#.", "....#...."],
  fox: ["#.......#", "##.....##", "#+#...#+#", "#########", "##.###.##", "#########", ".#######.", "..##+##..", "...###..."],
  particles: [".#.....#.", "###...###", ".#..#..#.", "...###...", "....#....", ".#.....#.", "###...###", ".#.....#."],
  prefix: ["##.....##", "#...#...#", "#..#.#..#", "#..###..#", "#..#.#..#", "##.....##"],
  cape: ["..#####..", ".##+++##.", ".#+++++#.", ".#+++++#.", "#+++++++#", "#+++++++#", "#+++++++#", "##+#+#+##", "#.#.#.#.#"],
  padlock: ["...###...", "..#...#..", "..#......", "..#......", ".#######.", ".###.###.", ".###.###.", ".#######.", ".#######."],
  chat: [".#######.", "#########", "##+++++##", "#########", "##+++####", "#########", ".#######.", ".##......", ".#......."],
  bolt: ["....##", "...##.", "..##..", ".#####", "...##.", "..##..", ".##...", "##...."],
  skull: ["..#####..", ".#######.", "#########", "##..#..##", "##..#..##", "#########", ".###+###.", "..#.#.#..", "..#####.."],
  backpack: ["...###...", "..#...#..", ".#######.", "##+++++##", "##+++++##", "#########", "##+###+##", "##+++++##", ".#######."],
} satisfies Record<string, string[]>;

type Pictogram = keyof typeof BITMAPS;

const BY_PRODUCT: Record<string, Pictogram> = {
  "p-case-aurora": "gem",
  "p-keys-10": "key",
  "p-pet-fox": "fox",
  "p-particles-snow": "particles",
  "p-prefix": "prefix",
  "p-cape-night": "cape",
  "p-unmute": "chat",
  "p-pool-xp": "bolt",
  "p-pool-dragon": "skull",
};

const BY_KIND: Record<string, Pictogram> = {
  rank: "crown",
  subscription: "crown",
  case: "chest",
  currency: "snowflake",
  kit: "backpack",
  unban: "padlock",
  cosmetic: "cape",
  pool: "bolt",
};

/** Tier pips under the crown / snowflake: Snow · Frost · Blizzard · Aurora · Arctic */
const TIER: Record<string, number> = {
  "p-snow": 1,
  "p-frost": 2,
  "p-frost-sub": 2,
  "p-blizzard": 3,
  "p-aurora": 4,
  "p-arctic": 5,
  "p-coins-1k": 1,
  "p-coins-5k": 2,
  "p-coins-15k": 3,
};

const PIPS: Record<number, number[]> = { 1: [4], 2: [3, 5], 3: [2, 4, 6], 4: [1, 3, 5, 7], 5: [0, 2, 4, 6, 8] };

function bitmapFor(id: string, kind: string): string[] {
  const rows = BITMAPS[BY_PRODUCT[id] ?? BY_KIND[kind] ?? "chest"];
  const tier = TIER[id];
  if (!tier) return rows;
  const pips = ".........".split("").map((c, x) => (PIPS[tier].includes(x) ? "+" : c)).join("");
  return [...rows, ".........", pips];
}

export function PixelPictogram({ id, kind, size, className }: { id: string; kind: string; size: number; className?: string }) {
  const rows = bitmapFor(id, kind);
  const w = Math.max(...rows.map((r) => r.length));
  const h = rows.length;
  const cells: { x: number; y: number; o: number }[] = [];
  rows.forEach((row, y) => {
    row.split("").forEach((c, x) => {
      if (c === "#") cells.push({ x, y, o: 1 });
      else if (c === "+") cells.push({ x, y, o: 0.5 });
    });
  });
  // Square viewBox so every pictogram sits on the same pixel grid.
  const side = Math.max(w, h, 9);
  const ox = (side - w) / 2;
  const oy = (side - h) / 2;
  return (
    <svg viewBox={`0 0 ${side} ${side}`} width={size} height={size} shapeRendering="crispEdges" className={className} aria-hidden>
      {cells.map((c, i) => (
        <rect key={i} x={c.x + ox} y={c.y + oy} width={1} height={1} fill="#ffffff" opacity={c.o} />
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

/** Tile gradient by category, so a row of one category reads as a family. */
const CATEGORY_TINT: Record<string, string> = {
  Привилегии: "from-azure-500 via-azure-700 to-azure-950",
  Подписка: "from-azure-400 via-azure-700 to-azure-950",
  Кейсы: "from-ice-500 via-ice-600 to-ice-900",
  Валюта: "from-fg-3 via-surface-4 to-surface",
  Наборы: "from-azure-600 via-azure-900 to-canvas",
  Разбан: "from-azure-800 via-azure-950 to-canvas",
  Косметика: "from-ice-400 via-azure-700 to-azure-950",
  Складчина: "from-ice-500 via-azure-800 to-azure-950",
};

type ArtProduct = Pick<StoreProduct, "id" | "glyph" | "kind" | "category">;

/** Product art: category-tinted tile, engineering grid, the item's pixel pictogram. */
export function ProductArt({ p, className, size = "lg" }: { p: ArtProduct; className?: string; size?: "sm" | "md" | "lg" }) {
  return (
    <div
      className={cn(
        "relative isolate flex shrink-0 items-center justify-center overflow-hidden rounded-(--st-r-art,10px) bg-gradient-to-br ring-1 ring-white/10 ring-inset",
        CATEGORY_TINT[p.category] ?? CATEGORY_TINT["Привилегии"],
        size === "sm" && "size-10",
        size === "md" && "size-16",
        size === "lg" && "h-28 w-full",
        className,
      )}
      aria-hidden
    >
      <div className="absolute inset-0 -z-10 bg-grid-sm opacity-70" />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(to_bottom,rgb(255_255_255/0.12),transparent_45%)]" />
      {size === "lg" ? (
        <>
          <span className="label-mono absolute top-2.5 left-2.5 rounded-[3px] bg-black/40 px-1.5 py-0.5 text-[9.5px] text-white/85">{KIND_LABEL[p.kind]}</span>
          <PixelPictogram id={p.id} kind={p.kind} size={60} className="drop-shadow-[0_3px_0_rgb(0_0_0/0.28)]" />
          <span className="absolute bottom-2.5 left-2.5 rounded-[3px] bg-black/40 px-1.5 py-0.5 font-mono text-[10px] leading-none font-semibold text-white/85">
            {p.glyph}
          </span>
        </>
      ) : (
        <PixelPictogram id={p.id} kind={p.kind} size={size === "sm" ? 24 : 36} className="drop-shadow-[0_2px_0_rgb(0_0_0/0.28)]" />
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
