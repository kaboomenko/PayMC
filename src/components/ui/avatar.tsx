import * as React from "react";
import { cn } from "@/lib/utils";

function hash(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const PALETTES = [
  ["#3377ff", "#8cb9ff", "#0d1a3d"],
  ["#22b8f0", "#b5ecff", "#0a3347"],
  ["#5c98ff", "#edf1f8", "#162d6a"],
  ["#55cfff", "#3377ff", "#0e121b"],
  ["#8cb9ff", "#22b8f0", "#141a26"],
  ["#edf1f8", "#5c98ff", "#1a3e98"],
];

/**
 * Pixel identicon — a symmetric 6×6 "block" avatar generated from a nickname.
 * Game-flavoured without using any game's copyrighted skins.
 */
export function PixelAvatar({ name, size = 28, className }: { name: string; size?: number; className?: string }) {
  const h = hash(name.toLowerCase());
  const pal = PALETTES[h % PALETTES.length];
  const cells: { x: number; y: number; c: string }[] = [];
  let bits = h;
  for (let y = 0; y < 6; y++) {
    for (let x = 0; x < 3; x++) {
      bits = Math.imul(bits ^ (bits >>> 13), 0x5bd1e995) >>> 0;
      const v = bits % 5;
      if (v === 0) continue;
      const c = v < 3 ? pal[0] : v < 4 ? pal[1] : pal[2];
      cells.push({ x, y, c }, { x: 5 - x, y, c });
    }
  }
  return (
    <span
      className={cn("inline-flex shrink-0 overflow-hidden rounded-sm ring-1 ring-line-strong", className)}
      style={{ width: size, height: size, background: pal[2] }}
      aria-hidden
    >
      <svg viewBox="0 0 6 6" width={size} height={size} shapeRendering="crispEdges">
        {cells.map((cell, i) => (
          <rect key={i} x={cell.x} y={cell.y} width={1} height={1} fill={cell.c} />
        ))}
      </svg>
    </span>
  );
}

/** Initials avatar for team members / owners */
export function Avatar({ name, size = 28, className }: { name: string; size?: number; className?: string }) {
  const initials = name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const h = hash(name);
  const hues = ["from-azure-600 to-azure-800", "from-ice-500 to-azure-700", "from-azure-400 to-azure-700", "from-ice-600 to-azure-900"];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-medium text-white ring-1 ring-white/10",
        hues[h % hues.length],
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.max(10, size * 0.38) }}
      aria-hidden
    >
      {initials}
    </span>
  );
}
