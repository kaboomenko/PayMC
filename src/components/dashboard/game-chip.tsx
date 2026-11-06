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

const TONE: Record<GameId, string> = {
  minecraft: "from-azure-500 to-azure-800",
  rust: "from-ice-500 to-azure-800",
  gta5: "from-azure-300 to-azure-700",
  ark: "from-ice-400 to-azure-700",
  unturned: "from-azure-400 to-azure-900",
  gmod: "from-ice-600 to-azure-900",
  cs2: "from-azure-600 to-azure-950",
  dayz: "from-ice-500 to-azure-900",
  scum: "from-azure-500 to-azure-950",
  "7dtd": "from-ice-600 to-azure-950",
  pz: "from-azure-400 to-azure-800",
  valheim: "from-ice-400 to-azure-800",
  palworld: "from-ice-300 to-azure-700",
  terraria: "from-azure-300 to-azure-800",
  hytale: "from-ice-300 to-azure-600",
  samp: "from-azure-500 to-azure-900",
};

/** Monogram tile for a game — no third-party logos, consistent with the palette. */
export function GameChip({ game, size = 24, className }: { game: GameId; size?: number; className?: string }) {
  const label = SHORT[game];
  return (
    <span
      aria-hidden
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-md bg-gradient-to-br font-mono font-semibold text-white ring-1 ring-white/10 ring-inset",
        TONE[game],
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.max(8, size * (label.length > 2 ? 0.3 : 0.38)) }}
    >
      <span className="absolute inset-0 bg-[linear-gradient(to_bottom,rgb(255_255_255/0.18),transparent_45%)]" />
      <span className="relative tracking-tight">{label}</span>
    </span>
  );
}
