import { createRng } from "@/lib/utils";

/**
 * A generic blocky night landscape (no game art): stars, a square moon,
 * a far ridge and snowy terrain with spruces. Deterministic — same output
 * on the server and in the browser.
 */
const W = 320;
const H = 200;
const B = 8;
const COLS = W / B;

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

function build(seed: number) {
  const rng = createRng(seed);
  const stars = Array.from({ length: 54 }, () => ({
    x: Math.floor((rng() * W) / 2) * 2,
    y: Math.floor((rng() * 104) / 2) * 2,
    o: 0.12 + rng() * 0.5,
    s: rng() > 0.88 ? 2 : 1,
  }));
  const far: number[] = [];
  let h = 10;
  for (let x = 0; x < COLS; x++) {
    h = clamp(h + Math.round((rng() - 0.5) * 3), 7, 14);
    far.push(h);
  }
  const near: number[] = [];
  h = 5;
  for (let x = 0; x < COLS; x++) {
    if (rng() < 0.32) h = clamp(h + (rng() < 0.5 ? -1 : 1), 3, 7);
    near.push(h);
  }
  const blocks: { x: number; y: number; kind: "stone" | "ice" | "deep" }[] = [];
  near.forEach((col, x) => {
    for (let y = 1; y < col; y++) {
      const n = rng();
      if (n > 0.9) blocks.push({ x, y, kind: "ice" });
      else if (n > 0.62) blocks.push({ x, y, kind: "stone" });
      else if (y > 3 && n < 0.2) blocks.push({ x, y, kind: "deep" });
    }
  });
  const trees = [3, 9, 10, 23, 31, 36].filter((x) => x < COLS).map((x) => ({ x, top: H - near[x] * B }));
  return { stars, far, near, blocks, trees };
}

const SCENE = build(20261106);

export function PixelScene({ className }: { className?: string }) {
  const { stars, far, near, blocks, trees } = SCENE;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMax slice"
      shapeRendering="crispEdges"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id="ps-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0b1631" />
          <stop offset="70%" stopColor="#080d18" />
          <stop offset="100%" stopColor="#05070b" />
        </linearGradient>
        <linearGradient id="ps-fog" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#05070b" stopOpacity="0" />
          <stop offset="100%" stopColor="#05070b" stopOpacity="0.85" />
        </linearGradient>
      </defs>
      <rect width={W} height={H} fill="url(#ps-sky)" />
      {stars.map((s, i) => (
        <rect key={i} x={s.x} y={s.y} width={s.s} height={s.s} fill="#b2bccd" opacity={s.o} />
      ))}
      {/* square moon */}
      <rect x={250} y={22} width={14} height={14} fill="#dcf6ff" opacity={0.9} />
      <rect x={253} y={25} width={3} height={3} fill="#b5ecff" />
      <rect x={258} y={30} width={4} height={3} fill="#b5ecff" />
      {/* far ridge */}
      {far.map((c, x) => (
        <g key={`f${x}`}>
          <rect x={x * B} y={H - c * B} width={B} height={c * B} fill="#0e121b" />
          <rect x={x * B} y={H - c * B} width={B} height={2} fill="#4d586c" opacity={0.35} />
        </g>
      ))}
      {/* trees */}
      {trees.map((t) => {
        const cx = t.x * B;
        return (
          <g key={`t${t.x}`}>
            <rect x={cx + 3} y={t.top - 12} width={2} height={12} fill="#05070b" />
            <rect x={cx - 4} y={t.top - 16} width={16} height={6} fill="#0a2333" />
            <rect x={cx - 2} y={t.top - 22} width={12} height={6} fill="#0a2333" />
            <rect x={cx} y={t.top - 28} width={8} height={6} fill="#0a2333" />
            <rect x={cx - 4} y={t.top - 16} width={16} height={1.5} fill="#dcf6ff" opacity={0.45} />
            <rect x={cx - 2} y={t.top - 22} width={12} height={1.5} fill="#dcf6ff" opacity={0.45} />
            <rect x={cx} y={t.top - 28} width={8} height={1.5} fill="#dcf6ff" opacity={0.5} />
          </g>
        );
      })}
      {/* near terrain */}
      {near.map((c, x) => (
        <g key={`n${x}`}>
          <rect x={x * B} y={H - c * B} width={B} height={c * B} fill="#141a26" />
          <rect x={x * B} y={H - c * B} width={B} height={3} fill="#c9d4e6" opacity={0.7} />
        </g>
      ))}
      {blocks.map((b, i) => (
        <rect
          key={`b${i}`}
          x={b.x * B}
          y={H - (near[b.x] - b.y) * B}
          width={B}
          height={B}
          fill={b.kind === "ice" ? "#22b8f0" : b.kind === "stone" ? "#1b2231" : "#0e121b"}
          opacity={b.kind === "ice" ? 0.28 : 1}
        />
      ))}
      <rect y={H - 70} width={W} height={70} fill="url(#ps-fog)" />
    </svg>
  );
}
