import { cn, createRng } from "@/lib/utils";
import { formatDateNumeric, formatMoney, formatNumber, formatPercent, formatTime } from "@/lib/format";
import { NOW_MS } from "@/lib/mock/now";

/** Deterministic QR-like glyph (21×21 modules with three finder squares). */
function QrGlyph({ size = 52, seed = 2051 }: { size?: number; seed?: number }) {
  const rng = createRng(seed);
  const N = 21;
  const cells: { x: number; y: number }[] = [];
  const inFinder = (x: number, y: number) => (x < 8 && y < 8) || (x > N - 9 && y < 8) || (x < 8 && y > N - 9);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!inFinder(x, y) && rng() > 0.52) cells.push({ x, y });
  const finder = (ox: number, oy: number) => (
    <g key={`${ox}-${oy}`}>
      <rect x={ox} y={oy} width={7} height={7} fill="currentColor" />
      <rect x={ox + 1} y={oy + 1} width={5} height={5} fill="var(--qr-bg)" />
      <rect x={ox + 2} y={oy + 2} width={3} height={3} fill="currentColor" />
    </g>
  );
  return (
    <svg viewBox={`0 0 ${N} ${N}`} width={size} height={size} shapeRendering="crispEdges" aria-hidden>
      {cells.map((c, i) => (
        <rect key={i} x={c.x} y={c.y} width={1} height={1} fill="currentColor" />
      ))}
      {finder(0, 0)}
      {finder(N - 7, 0)}
      {finder(0, N - 7)}
    </svg>
  );
}

const INCOME = 1_660_000;
const LIMIT = 2_400_000;

/**
 * НПД receipt mock + yearly limit tracker. Server component — rendered inside
 * the (client) money bento as a slot.
 */
export function ReceiptCard() {
  const paidAt = NOW_MS - 18_000;
  const pct = (INCOME / LIMIT) * 100;
  return (
    <div className="grid flex-1 gap-5 sm:grid-cols-[200px_minmax(0,1fr)] lg:grid-cols-1 xl:grid-cols-[196px_minmax(0,1fr)]">
      <figure
        aria-label="Пример чека самозанятого"
        className="relative w-full max-w-[280px] self-start rounded-t-sm bg-[#e8edf6] px-3.5 pt-3 pb-5 font-mono text-[10px] leading-[1.5] text-surface-3 [--qr-bg:#e8edf6] [mask-image:radial-gradient(circle_at_50%_100%,transparent_3px,#000_3.5px)] [mask-repeat:repeat-x] [mask-size:9px_100%]"
      >
        <p className="text-center text-[10.5px] font-semibold tracking-wide">ЧЕК № 205k1mzq8c</p>
        <p className="text-center text-[9.5px] opacity-70">
          {formatDateNumeric(paidAt)} {formatTime(paidAt)} (+03:00)
        </p>
        <div className="my-2 border-t border-dashed border-surface-3/30" />
        <p>Ковалёв Артём Сергеевич</p>
        <p className="opacity-70">Режим НО: НПД</p>
        <p className="opacity-70">ИНН 7707•••••91</p>
        <div className="my-2 border-t border-dashed border-surface-3/30" />
        <div className="flex justify-between gap-2">
          <span>1. Привилегия Frost, 30 дней</span>
        </div>
        <div className="flex justify-between gap-2 opacity-80">
          <span>1 × 299,00</span>
          <span>299,00</span>
        </div>
        <div className="my-2 border-t border-dashed border-surface-3/30" />
        <div className="flex justify-between gap-2 text-[11px] font-semibold">
          <span>Итого</span>
          <span>{formatMoney(299, { fraction: true })}</span>
        </div>
        <div className="mt-2.5 flex items-center gap-2.5">
          <span className="text-surface-3">
            <QrGlyph size={44} />
          </span>
          <span className="text-[9.5px] leading-snug opacity-75">
            Покупатель: физ. лицо
            <br />
            Сформирован в «Мой налог»
          </span>
        </div>
      </figure>

      <div className="flex min-w-0 flex-col">
        <p className="text-[13px] leading-relaxed text-fg-2">
          Чек уходит в «Мой налог» сразу после оплаты, копия — игроку на почту. Для ИП и ООО — облачная касса по 54-ФЗ.
        </p>

        <div className="mt-5">
          <div className="flex items-baseline justify-between gap-2">
            <p className="label-mono text-[10px] text-fg-4">Лимит НПД в 2026 году</p>
            <p className="font-mono text-[12px] text-fg nums">{formatPercent(pct, { digits: 0 })}</p>
          </div>
          <p className="mt-1 font-mono text-[13px] text-fg-2 nums">
            {formatNumber(INCOME / 1_000_000, 2)} млн из {formatNumber(LIMIT / 1_000_000, 1)} млн ₽
          </p>
          <div className="relative mt-2.5 h-2 rounded-full bg-white/[0.06]">
            <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-azure-600 to-azure-400" style={{ width: `${pct}%` }} />
            {[80, 95].map((m) => (
              <span key={m} aria-hidden className={cn("absolute -top-1 -bottom-1 w-px", m === 80 ? "bg-warn/70" : "bg-bad/70")} style={{ left: `${m}%` }} />
            ))}
          </div>
          <div className="relative mt-1.5 h-4 font-mono text-[10px] text-fg-4">
            <span className="absolute -translate-x-full pr-1 whitespace-nowrap text-warn/80" style={{ left: "80%" }}>
              80 %
            </span>
            <span className="absolute -translate-x-[78%] whitespace-nowrap text-bad/80" style={{ left: "95%" }}>
              95 %
            </span>
          </div>
          <p className="mt-2 text-[12px] leading-snug text-fg-3">
            Осталось {formatNumber((LIMIT - INCOME) / 1000)} тыс ₽. На 80 % предупредим, на 95 % — предложим перейти на ИП, чтобы не
            прерывать приём платежей.
          </p>
        </div>
      </div>
    </div>
  );
}
