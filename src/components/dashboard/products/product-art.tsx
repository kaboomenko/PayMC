import { cn } from "@/lib/utils";

/**
 * Generated product art: a tinted tile with an engineering grid, one geometric
 * accent and the product glyph. Six tints, all inside the azure/ice family —
 * no third-party item renders, no stock icons. Server-safe (no hooks).
 */
const TINTS = [
  "from-azure-500 via-azure-700 to-azure-950 border-azure-400/30",
  "from-ice-500 via-azure-700 to-azure-950 border-ice-400/30",
  "from-azure-300 via-azure-600 to-azure-900 border-azure-300/30",
  "from-azure-800 via-azure-900 to-canvas border-azure-500/25",
  "from-ice-300 via-ice-600 to-azure-900 border-ice-300/30",
  "from-surface-4 via-azure-950 to-canvas border-line-strong",
] as const;

function Accent({ tint }: { tint: number }) {
  switch (tint % 6) {
    case 0:
      return <span className="absolute -top-[18%] -right-[18%] size-[48%] rotate-45 bg-ice-400/25" />;
    case 1:
      return (
        <>
          <span className="absolute -right-[10%] bottom-[22%] h-[9%] w-[70%] -rotate-[32deg] bg-white/15" />
          <span className="absolute -right-[10%] bottom-[4%] h-[9%] w-[70%] -rotate-[32deg] bg-white/10" />
        </>
      );
    case 2:
      return <span className="absolute -bottom-[28%] -left-[28%] size-[70%] rounded-full border-[3px] border-ice-200/25" />;
    case 3:
      return (
        <span className="absolute top-[12%] right-[12%] grid grid-cols-2 gap-[2px]">
          <span className="size-[5px] bg-ice-300/70" />
          <span className="size-[5px] bg-ice-300/30" />
          <span className="size-[5px] bg-ice-300/30" />
          <span className="size-[5px] bg-ice-300/60" />
        </span>
      );
    case 4:
      return <span className="absolute -bottom-[20%] -left-[20%] size-[50%] rotate-45 bg-white/20" />;
    default:
      return <span className="absolute inset-x-0 top-[62%] h-[14%] bg-ice-400/15" />;
  }
}

export function ProductArt({
  tint,
  glyph,
  size = 40,
  className,
}: {
  tint: number;
  glyph: string;
  size?: number;
  className?: string;
}) {
  const g = glyph.trim().slice(0, 3) || "?";
  const scale = g.length === 1 ? 0.42 : g.length === 2 ? 0.34 : 0.27;
  return (
    <div
      aria-hidden
      className={cn(
        "relative flex shrink-0 items-center justify-center overflow-hidden border bg-gradient-to-br",
        size >= 56 ? "rounded-lg" : "rounded-md",
        TINTS[((tint % 6) + 6) % 6],
        className,
      )}
      style={{ width: size, height: size }}
    >
      <span className="absolute inset-0 bg-grid-sm opacity-70" />
      <Accent tint={tint} />
      <span
        className="relative font-display leading-none font-semibold tracking-[-0.04em] text-white"
        style={{ fontSize: Math.round(size * scale) }}
      >
        {g}
      </span>
    </div>
  );
}

export const ART_TINTS = TINTS.length;
