import * as React from "react";
import { createRng } from "@/lib/utils";

/**
 * Stylized (non-scannable) QR made of squares: three finder patterns,
 * timing lines, one alignment mark and seeded data modules.
 */
function build(seed: number, n: number) {
  const rng = createRng(seed);
  const on = new Array<boolean>(n * n).fill(false);
  const reserved = new Array<boolean>(n * n).fill(false);
  const set = (x: number, y: number, v: boolean) => {
    if (x < 0 || y < 0 || x >= n || y >= n) return;
    on[y * n + x] = v;
    reserved[y * n + x] = true;
  };
  const finder = (ox: number, oy: number) => {
    for (let y = -1; y <= 7; y++)
      for (let x = -1; x <= 7; x++) {
        const ring = x >= 0 && x <= 6 && y >= 0 && y <= 6 && (x === 0 || x === 6 || y === 0 || y === 6);
        const core = x >= 2 && x <= 4 && y >= 2 && y <= 4;
        set(ox + x, oy + y, ring || core);
      }
  };
  finder(0, 0);
  finder(n - 7, 0);
  finder(0, n - 7);
  for (let i = 8; i < n - 8; i++) {
    set(i, 6, i % 2 === 0);
    set(6, i, i % 2 === 0);
  }
  const a = n - 9;
  for (let y = -2; y <= 2; y++)
    for (let x = -2; x <= 2; x++) set(a + x, a + y, Math.max(Math.abs(x), Math.abs(y)) !== 1);
  for (let i = 0; i < n * n; i++) if (!reserved[i]) on[i] = rng() > 0.52;
  return on;
}

export function PixelQr({ seed, size = 25, className, label }: { seed: number; size?: number; className?: string; label?: string }) {
  const cells = React.useMemo(() => build(seed, size), [seed, size]);
  return (
    <svg
      viewBox={`-1 -1 ${size + 2} ${size + 2}`}
      shapeRendering="crispEdges"
      className={className}
      role="img"
      aria-label={label ?? "QR-код для оплаты по СБП"}
    >
      <rect x={-1} y={-1} width={size + 2} height={size + 2} fill="#edf1f8" />
      {cells.map((v, i) =>
        v ? <rect key={i} x={i % size} y={Math.floor(i / size)} width={1.02} height={1.02} fill="#05070b" /> : null,
      )}
    </svg>
  );
}
