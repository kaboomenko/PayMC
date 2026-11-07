"use client";

import * as React from "react";
import { AreaTrend, CHART } from "@/components/charts";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatDate, formatDateShort, formatMoney, formatPercent, formatWeekday, pluralize } from "@/lib/format";
import { Change, axisMoney } from "./bits";
import { STAT_LABEL, STAT_VALUE } from "./stat-strip";
import { usePeriod } from "./period-context";
import type { OverviewPulseData } from "./types";

const PREV_COLOR = "#7c889d";

export function KpiTiles({ data }: { data: OverviewPulseData }) {
  const { period } = usePeriod();
  const bundle = data.periods[period];
  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4 xl:gap-4">
      {bundle.kpis.map((k) => (
        <div
          key={k.id}
          className="group relative flex flex-col overflow-hidden rounded-xl border border-line bg-surface p-3.5 shadow-raise transition-colors hover:border-line-strong sm:p-4"
        >
          <p className={cn(STAT_LABEL, "line-clamp-2 min-h-[2.6em] sm:min-h-0")}>{k.label}</p>
          <div className="mt-2 flex flex-col items-start gap-1 sm:flex-row sm:items-baseline sm:justify-between sm:gap-2">
            <p className={STAT_VALUE}>{k.value}</p>
            <Change value={k.delta} unit={k.deltaUnit} />
          </div>
          <p className="mt-1.5 truncate font-mono text-[11px] text-fg-4 nums">
            {k.sub ? k.sub : <>было {k.prev}</>}
          </p>
          <p className="mt-3 border-t border-line-soft pt-2 text-[11px] leading-snug text-fg-4">{k.caption}</p>
        </div>
      ))}
    </div>
  );
}

/** Height of a flex-grown box, so a fixed-height chart can fill whatever the grid row gives it. */
function useBoxHeight<T extends HTMLElement>(min: number) {
  const ref = React.useRef<T>(null);
  const [height, setHeight] = React.useState(min);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setHeight(Math.max(min, Math.floor(entry.contentRect.height))));
    ro.observe(el);
    return () => ro.disconnect();
  }, [min]);
  return [ref, height] as const;
}

export function RevenueCard({ data }: { data: OverviewPulseData }) {
  const { period } = usePeriod();
  const [chartBox, chartHeight] = useBoxHeight<HTMLDivElement>(236);
  const b = data.periods[period];
  const lastDate = b.series[b.series.length - 1]?.date;
  const isPartial = (v: string | number) => v === lastDate;
  const todayVsWeek = data.today.sameTimeLastWeek ? ((data.today.gross - data.today.sameTimeLastWeek) / data.today.sameTimeLastWeek) * 100 : 0;

  const stats: { label: string; value: string; hint: React.ReactNode }[] = [
    {
      label: "Лучший день",
      value: formatMoney(b.best.revenue),
      hint: `${formatWeekday(b.best.date)}, ${formatDate(b.best.date, { year: false })}`,
    },
    { label: "В среднем за день", value: formatMoney(b.avgPerDay), hint: "по полным дням" },
    {
      label: "Сегодня к 12:00",
      value: formatMoney(data.today.gross),
      hint: (
        <>
          {pluralize(data.today.orders, ["заказ", "заказа", "заказов"])} ·{" "}
          <span className={todayVsWeek >= 0 ? "text-ok" : "text-bad"}>{formatPercent(todayVsWeek, { digits: 0, signed: true })}</span> к {formatDateShort(data.today.weekAgo)}
        </>
      ),
    },
    {
      label: "Прогноз на ноябрь",
      value: formatMoney(data.novemberForecast.forecast),
      hint: `${formatMoney(data.novemberForecast.actual)} уже собрано`,
    },
  ];

  return (
    <Card className="flex min-w-0 flex-col overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3 px-4 pt-4 sm:px-5">
        <div className="min-w-0">
          <p className="label-mono text-fg-3">Выручка по дням · {pluralize(b.days, ["день", "дня", "дней"])}</p>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-mono text-[26px] leading-none font-semibold tracking-[-0.03em] text-fg nums sm:text-[30px]">
              {formatMoney(b.total)}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-fg-4">
              <Change value={b.delta} />к прошлым {b.days} дням
            </span>
          </div>
        </div>
        <ul className="flex items-center gap-4 pt-1 text-[11.5px] text-fg-3" aria-label="Легенда">
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="h-[2px] w-4 rounded-full" style={{ background: CHART.azure }} />
            Этот период
          </li>
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="h-0 w-4 border-t border-dashed" style={{ borderColor: PREV_COLOR }} />
            Прошлый
          </li>
        </ul>
      </div>

      <div ref={chartBox} className="relative mt-3 min-h-[236px] flex-1">
        <div className="absolute inset-0 pr-3 pl-1">
      <AreaTrend
        height={chartHeight}
        data={b.series}
        xKey="date"
        series={[
          { key: "cur", label: "Этот период", color: CHART.azure },
          { key: "prev", label: "Прошлый период", color: PREV_COLOR, dashed: true },
        ]}
        formatX={(v) => formatDateShort(String(v))}
        formatY={axisMoney}
        formatValue={(v) => formatMoney(v)}
        formatTitle={(v) => (isPartial(v) ? `${formatDateShort(String(v))} · до 12:00, неполный день` : `${formatWeekday(String(v))}, ${formatDateShort(String(v))}`)}
      />
        </div>
      </div>

      <dl className="grid grid-cols-2 border-t border-line-soft sm:grid-cols-4">
        {stats.map((s, i) => (
          <div
            key={s.label}
            className={cn(
              "min-w-0 px-4 py-3 sm:px-5",
              i % 2 === 1 && "border-l border-line-soft",
              i >= 2 && "border-t border-line-soft sm:border-t-0",
              i === 2 && "sm:border-l",
            )}
          >
            <dt className="label-mono text-fg-4">{s.label}</dt>
            <dd className="mt-1 font-mono text-[15px] font-semibold text-fg nums">{s.value}</dd>
            <dd className="mt-0.5 truncate text-[11.5px] text-fg-3">{s.hint}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
