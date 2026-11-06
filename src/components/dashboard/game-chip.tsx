import { cn } from "@/lib/utils";
import type { GameId } from "@/lib/mock/types";

const SHORT: Record<GameId, string> = {
  minecraft: "MC",
  rust: "RS",
  gta5: "GTA",
  ark: "ARK",
  unturned: "UT",
  gmod: "GM",
  cs2: "CS2",
  dayz: "DZ",
  scum: "SC",
  "7dtd": "7D",
  pz: "PZ",
  valheim: "VH",
  palworld: "PW",
  terraria: "TR",
  hytale: "HY",
  samp: "SA",
};

/** Monogram tile for a game — no third-party logos, consistent with the palette. */
export function GameChip({ game, size = 24, className }: { game: GameId; size?: number; className?: string }) {
  const label = SHORT[game];
  return (
    <span
      aria-hidden
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-md bg-surface-4 font-mono font-medium text-fg ring-1 ring-line-strong ring-inset",
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.max(8, size * (label.length > 2 ? 0.3 : 0.38)) }}
    >
      <span className="relative">{label}</span>
    </span>
  );
}
