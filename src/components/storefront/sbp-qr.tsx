import * as React from "react";
import { createRng, cn } from "@/lib/utils";

const N = 29;

function reserved(x: number, y: number) {
  // finders + separators
  const inZone = (bx: number, by: number) => x >= bx - 1 && x <= bx + 7 && y >= by - 1 && y <= by + 7;
  if (inZone(0, 0) || inZone(N - 7, 0) || inZone(0, N - 7)) return true;
  // timing patterns
  if (x === 6 || y === 6) return true;
  // alignment pattern
  if (x >= N - 9 && x <= N - 5 && y >= N - 9 && y <= N - 5) return true;
  // center logo window
  if (x >= 11 && x <= 17 && y >= 11 && y <= 17) return true;
  return false;
}

/**
 * Stylized, deterministic "QR" for the SBP payment step. Not a scannable
 * code — the concept has no backend — but it reads as one: three finders,
 * timing lines, an alignment square and a quiet logo window.
 */
export function SbpQr({ seed, size = 196, className }: { seed: number; size?: number; className?: string }) {
  const rects = React.useMemo(() => {
    const rng = createRng(seed);
    const out: { x: number; y: number }[] = [];
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        if (reserved(x, y)) {
          if ((x === 6 && y > 7 && y < N - 8) || (y === 6 && x > 7 && x < N - 8)) {
            if ((x + y) % 2 === 0) out.push({ x, y });
          }
          continue;
        }
        if (rng() > 0.52) out.push({ x, y });
      }
    }
    return out;
  }, [seed]);

  const finder = (bx: number, by: number) => (
    <g key={`${bx}-${by}`}>
      <rect x={bx} y={by} width={7} height={7} rx={1.6} fill="#05070b" />
      <rect x={bx + 1} y={by + 1} width={5} height={5} rx={1.1} fill="#fff" />
      <rect x={bx + 2} y={by + 2} width={3} height={3} rx={0.7} fill="#05070b" />
    </g>
  );

  return (
    <div className={cn("relative inline-flex rounded-lg bg-white p-3 shadow-[0_0_0_1px_rgb(148_166_204/0.2)]", className)} role="img" aria-label="QR-код для оплаты через СБП">
      <svg viewBox={`0 0 ${N} ${N}`} width={size} height={size} shapeRendering="crispEdges">
        {rects.map((r) => (
          <rect key={`${r.x}:${r.y}`} x={r.x + 0.06} y={r.y + 0.06} width={0.88} height={0.88} rx={0.18} fill="#05070b" />
        ))}
        {finder(0, 0)}
        {finder(N - 7, 0)}
        {finder(0, N - 7)}
        <rect x={N - 9} y={N - 9} width={5} height={5} rx={1} fill="#05070b" />
        <rect x={N - 8} y={N - 8} width={3} height={3} rx={0.6} fill="#fff" />
        <rect x={N - 7} y={N - 7} width={1} height={1} fill="#05070b" />
        <rect x={11.5} y={11.5} width={6} height={6} rx={1.4} fill="#05070b" />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="font-mono text-[10.5px] font-bold tracking-tight text-white">СБП</span>
      </span>
    </div>
  );
}
