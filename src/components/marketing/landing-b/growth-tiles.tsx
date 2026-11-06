import { cn } from "@/lib/utils";
import { formatMoney, formatNumber, formatPercent, plural, pluralize } from "@/lib/format";
import { Avatar } from "@/components/ui/avatar";

/* ───────────── Wipe calendar ───────────── */

export interface WipeDay {
  n: number;
  wd: string;
  weekend: boolean;
  past: boolean;
  today: boolean;
  /** relative expected revenue 0..1 */
  h: number;
  wipe?: { discount: number; global: boolean };
}

export function WipeStrip({
  days,
  next,
}: {
  days: WipeDay[];
  next: { when: string; title: string; discount: number; countdown: string; uplift: number };
}) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="scrollbar-none -mx-5 overflow-x-auto px-5">
        <div className="min-w-[540px]">
          <div className="grid items-end gap-[3px]" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
            {days.map((d, i) => (
              <div key={i} className="relative flex h-[92px] flex-col justify-end">
                {d.wipe ? (
                  <span
                    className={cn(
                      "absolute -top-0.5 left-1/2 -translate-x-1/2 font-mono text-[9.5px] whitespace-nowrap",
                      d.past ? "text-fg-3" : "text-ice-300",
                    )}
                  >
                    −{d.wipe.discount}&nbsp;%
                  </span>
                ) : null}
                <span
                  className={cn(
                    "block w-full rounded-t-[2px]",
                    d.wipe
                      ? d.past
                        ? "bg-ice-400/45"
                        : "bg-ice-400"
                      : d.past
                        ? "bg-azure-500/45"
                        : "bg-[repeating-linear-gradient(135deg,rgb(92_152_255/0.28)_0_2px,transparent_2px_5px)] ring-1 ring-azure-500/25 ring-inset",
                  )}
                  style={{ height: `${Math.round(14 + d.h * 62)}px` }}
                />
                {d.today ? <span aria-hidden className="absolute inset-y-0 -right-[2.5px] w-px bg-fg-3" /> : null}
              </div>
            ))}
          </div>
          <div className="mt-1.5 grid gap-[3px] border-t border-line pt-1.5" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
            {days.map((d, i) => (
              <div key={i} className="text-center font-mono leading-tight">
                <p className={cn("text-[10px] nums", d.today ? "text-fg" : d.wipe ? "text-ice-300" : d.weekend ? "text-fg-3" : "text-fg-4")}>{d.n}</p>
                <p className="text-[8.5px] text-fg-4">{d.wd}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-fg-4">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-[2px] bg-ice-400" /> вайп, скидка включается сама
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-[2px] bg-azure-500/45" /> выручка
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-[2px] ring-1 ring-azure-500/40 ring-inset" /> прогноз
        </span>
      </div>

      <div className="mt-auto pt-4">
        <div className="grid gap-3 rounded-lg border border-line bg-surface-2 p-3 sm:grid-cols-[1fr_auto] sm:items-center">
          <div className="min-w-0">
            <p className="label-mono text-fg-4">Следующий вайп · {next.countdown}</p>
            <p className="mt-1 text-[13px] text-fg">
              <span className="font-mono text-fg-2 nums">{next.when}</span> — {next.title}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex h-6 items-center rounded-sm bg-ice-400/10 px-2 font-mono text-[11px] text-ice-300 ring-1 ring-ice-400/20 ring-inset">
              −{next.discount} % на 6 ч
            </span>
            <span className="inline-flex h-6 items-center gap-1.5 rounded-sm bg-ok-soft px-2 text-[11px] text-ok ring-1 ring-ok/20 ring-inset">
              <span className="size-1.5 rounded-full bg-ok" /> скидка стартует сама
            </span>
            <span className="inline-flex h-6 items-center rounded-sm px-2 font-mono text-[11px] text-fg-3 ring-1 ring-line-strong ring-inset">
              прогноз +{next.uplift} %
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ───────────── Creator codes ───────────── */

export interface CreatorRow {
  id: string;
  name: string;
  platform: string;
  code: string;
  share: number;
  revenue: number;
  owed: number;
}

export function CreatorBoard({
  rows,
  rest,
  totalOwed,
}: {
  rows: CreatorRow[];
  /** creators who are owed money but don't fit into the table */
  rest: { count: number; owed: number };
  totalOwed: number;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="overflow-hidden rounded-lg border border-line">
        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="border-b border-line bg-surface-2/60 text-left font-mono text-[10px] tracking-[0.07em] text-fg-4 uppercase">
              <th className="h-8 pl-3 font-medium">Блогер</th>
              <th className="h-8 px-2 font-medium">Код</th>
              <th className="hidden h-8 px-2 text-right font-medium sm:table-cell">Выручка</th>
              <th className="h-8 pr-3 text-right font-medium">Выплата</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id} className="border-b border-line-soft last:border-0">
                <td className="h-11 pl-3">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="w-3 font-mono text-[10.5px] text-fg-4 nums">{i + 1}</span>
                    <Avatar name={r.name} size={22} />
                    <span className="min-w-0">
                      <span className="block truncate text-fg">{r.name}</span>
                      <span className="block truncate text-[11px] text-fg-4">
                        {r.platform} · {formatPercent(r.share, { digits: 0 })}
                      </span>
                    </span>
                  </span>
                </td>
                <td className="px-2">
                  <span className="rounded-xs bg-white/[0.05] px-1.5 py-0.5 font-mono text-[11px] text-fg-2 ring-1 ring-line ring-inset">{r.code}</span>
                </td>
                <td className="hidden px-2 text-right font-mono text-fg-2 nums sm:table-cell">{formatMoney(r.revenue)}</td>
                <td className="pr-3 text-right font-mono text-ice-300 nums">{formatMoney(r.owed)}</td>
              </tr>
            ))}
            {rest.count > 0 ? (
              <tr className="border-t border-line-soft">
                <td colSpan={2} className="h-8 pl-3 text-[11.5px] text-fg-4">
                  <span className="pl-5">+ ещё {pluralize(rest.count, ["блогер", "блогера", "блогеров"])}</span>
                </td>
                <td className="hidden sm:table-cell" />
                <td className="pr-3 text-right font-mono text-[11.5px] text-fg-3 nums">{formatMoney(rest.owed)}</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <p className="mt-auto flex items-center justify-between gap-3 pt-3 text-[12px] text-fg-3">
        <span>Уйдёт блогерам завтра в 12:00 МСК — вместе с вашей выплатой</span>
        <span className="shrink-0 font-mono text-fg nums">{formatMoney(totalOwed)}</span>
      </p>
    </div>
  );
}

/* ───────────── A/B price test ───────────── */

export interface AbVariant {
  name: string;
  price: number;
  visitors: number;
  rpv: number;
  conv: number;
}

export function AbTest({ a, b, probability, daysLeft }: { a: AbVariant; b: AbVariant; probability: number; daysLeft: number }) {
  const max = Math.max(a.rpv, b.rpv);
  const lift = ((b.rpv - a.rpv) / a.rpv) * 100;
  const rows = [
    { v: a, lead: a.rpv >= b.rpv },
    { v: b, lead: b.rpv > a.rpv },
  ];
  return (
    <div className="flex flex-1 flex-col">
      <ul className="space-y-2.5">
        {rows.map(({ v, lead }) => (
          <li key={v.name} className={cn("rounded-lg border p-3", lead ? "border-azure-400/35 bg-azure-500/[0.06]" : "border-line bg-surface-2")}>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[12.5px] text-fg-2">
                {v.name.split(" · ")[0]} · <span className="font-mono text-fg nums">{formatMoney(v.price)}</span>
              </span>
              {lead ? <span className="font-mono text-[10.5px] text-azure-200">лидирует</span> : null}
            </div>
            <p className="mt-1.5 font-mono text-[18px] font-medium tracking-[-0.02em] text-fg nums">
              {formatMoney(v.rpv, { fraction: true })}
              <span className="ml-1.5 text-[11px] font-normal tracking-normal text-fg-3">на посетителя</span>
            </p>
            <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-white/[0.05]">
              <span className={cn("block h-full rounded-full", lead ? "bg-azure-400" : "bg-fg-4")} style={{ width: `${(v.rpv / max) * 100}%` }} />
            </span>
            <p className="mt-1.5 font-mono text-[10.5px] text-fg-4 nums">
              конверсия {formatPercent(v.conv)} · {formatNumber(v.visitors)} {plural(v.visitors, ["визит", "визита", "визитов"])}
            </p>
          </li>
        ))}
      </ul>
      <div className="mt-auto pt-4">
        <div className="flex items-baseline justify-between text-[12px]">
          <span className="text-fg-2">
            <span className="font-mono text-fg nums">{formatPercent(probability * 100, { digits: 0 })}</span> уверенности, что B лучше
          </span>
          <span className="font-mono text-ok nums">{formatPercent(lift, { signed: true })}</span>
        </div>
        <div className="relative mt-2 h-1.5 rounded-full bg-white/[0.05]">
          <span className="absolute inset-y-0 left-0 rounded-full bg-ice-400" style={{ width: `${probability * 100}%` }} />
          <span aria-hidden className="absolute -top-1 -bottom-1 left-[95%] w-px bg-fg-3" />
        </div>
        <p className="mt-1.5 text-[11px] text-fg-4">
          Остановим сами на 95&nbsp;% · осталось {pluralize(daysLeft, ["день", "дня", "дней"])}
        </p>
      </div>
    </div>
  );
}
