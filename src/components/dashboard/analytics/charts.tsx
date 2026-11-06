"use client";

import * as React from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CHART, ChartTooltipBox, Heatmap, axisTick, maxOf, niceScale } from "@/components/charts";
import { cn } from "@/lib/utils";
import { formatDateShort, formatMoney, formatNumber, formatPercent, formatWeekday } from "@/lib/format";
import { axisMoney } from "@/components/dashboard/overview/bits";
import type { ChartEvent, ForecastDatum } from "./data";

/* ───────────── Revenue × online ───────────── */

// Plot geometry: left axis 56px, right axis 40px, top margin 8px, x-axis 30px — overlays align to it.
const PLOT = { left: 56, right: 40, top: 8, bottom: 30 };

function useWidth<T extends HTMLElement>(fallback: number) {
  const ref = React.useRef<T>(null);
  const [width, setWidth] = React.useState(fallback);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

type ComboDatum = { date: string; revenue: number; online: number | null; onlineSoFar: number | null };

export function RevenueOnlineChart({
  data,
  events,
  height = 280,
}: {
  data: ComboDatum[];
  events: ChartEvent[];
  height?: number;
}) {
  const n = data.length || 1;
  const [laneRef, laneWidth] = useWidth<HTMLDivElement>(980);
  const lastDate = data[data.length - 1]?.date;
  // round ticks on both axes: 0 · 10 тыс · 20 тыс… and 0 · 150 · 300…
  const left = React.useMemo(() => niceScale(maxOf(data, ["revenue"])), [data]);
  const right = React.useMemo(() => niceScale(maxOf(data, ["online"])), [data]);

  // greedy two-lane layout so neighbouring labels never collide
  const placed = React.useMemo(() => {
    const ends: number[] = [-Infinity, -Infinity];
    return events.map((e) => {
      const center = ((e.from + e.to + 1) / 2 / n) * laneWidth;
      const label = e.title.length * 6.6 + (e.uplift !== null ? 52 : 0) + 8;
      let left = Math.min(Math.max(0, center - label / 2), Math.max(0, laneWidth - label));
      let lane = ends[0] <= left - 6 ? 0 : 1;
      if (lane === 1 && ends[1] > left - 6) {
        left = ends[1] + 6;
        lane = 1;
      }
      ends[lane] = left + label;
      return { ...e, lane, left, label };
    });
  }, [events, n, laneWidth]);

  return (
    <div>
      <div ref={laneRef} className="relative h-[46px]" style={{ marginLeft: PLOT.left, marginRight: PLOT.right }} aria-hidden>
        {placed.map((e) => {
          const from = (e.from / n) * 100;
          const width = ((e.to - e.from + 1) / n) * 100;
          return (
            <React.Fragment key={e.id}>
              <span
                className="absolute bottom-0 h-2 rounded-t-[3px] border-x border-t border-ice-400/50"
                style={{ left: `${from}%`, width: `max(${width}%, 6px)` }}
              />
              <span
                className="absolute flex h-[18px] items-center gap-1.5 whitespace-nowrap rounded-sm border border-line bg-surface-2 px-1.5 text-[11px] text-fg-2"
                style={{ left: e.left, bottom: e.lane === 0 ? 12 : 32 - 2 }}
                title={e.range}
              >
                {e.title}
                {e.uplift !== null ? (
                  <span className={cn("font-mono text-[10.5px] nums", e.uplift >= 0 ? "text-ice-300" : "text-bad")}>
                    {formatPercent(e.uplift, { digits: 0, signed: true })}
                  </span>
                ) : null}
              </span>
            </React.Fragment>
          );
        })}
      </div>
      <div className="relative">
        {/* Local bars + line chart (same theme as the shared ComboChart, which has one formatter for axis and tooltip). */}
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: PLOT.top, right: 0, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} stroke={CHART.grid} />
              <XAxis dataKey="date" tickLine={false} axisLine={false} tick={axisTick} tickFormatter={(v) => formatDateShort(String(v))} minTickGap={24} dy={6} height={PLOT.bottom} />
              <YAxis yAxisId="l" tickLine={false} axisLine={false} tick={axisTick} tickFormatter={axisMoney} width={PLOT.left} domain={left.domain} ticks={left.ticks} />
              <YAxis
                yAxisId="r"
                orientation="right"
                tickLine={false}
                axisLine={false}
                tick={axisTick}
                tickFormatter={(v) => formatNumber(Number(v))}
                width={PLOT.right}
                domain={right.domain}
                ticks={right.ticks}
              />
              <Tooltip
                cursor={{ fill: "rgba(148,166,204,0.05)" }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload as ComboDatum;
                  const partial = d.date === lastDate;
                  return (
                    <ChartTooltipBox
                      title={partial ? `${formatDateShort(String(label))} · до 12:00, день не закончился` : `${formatWeekday(String(label))}, ${formatDateShort(String(label))}`}
                      rows={
                        partial
                          ? [
                              { label: "Выручка к 12:00", value: formatMoney(d.revenue), color: CHART.azureStrong },
                              { label: "Пик онлайна к 12:00", value: d.onlineSoFar !== null ? formatNumber(d.onlineSoFar) : "—", color: CHART.ice },
                            ]
                          : [
                              { label: "Выручка", value: formatMoney(d.revenue), color: CHART.azureStrong },
                              { label: "Пиковый онлайн", value: d.online !== null ? formatNumber(d.online) : "—", color: CHART.ice },
                              { label: "₽ на игрока онлайн", value: d.online ? formatMoney(d.revenue / d.online, { fraction: true }) : "—" },
                            ]
                      }
                    />
                  );
                }}
              />
              <Bar yAxisId="l" dataKey="revenue" radius={[3, 3, 0, 0]} maxBarSize={22} isAnimationActive={false}>
                {data.map((d) => (
                  <Cell key={d.date} fill={CHART.azureStrong} fillOpacity={d.date === lastDate ? 0.4 : 1} />
                ))}
              </Bar>
              <Line
                yAxisId="r"
                type="monotone"
                dataKey="online"
                stroke={CHART.ice}
                strokeWidth={1.75}
                dot={false}
                connectNulls={false}
                activeDot={{ r: 3.5, strokeWidth: 2, stroke: "#05070b", fill: CHART.ice }}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute"
          style={{ left: PLOT.left, right: PLOT.right, top: PLOT.top, bottom: PLOT.bottom }}
        >
          {events.map((e) => (
            <span
              key={e.id}
              className="absolute inset-y-0 border-x border-dashed border-ice-400/25 bg-ice-400/[0.045]"
              style={{ left: `${(e.from / n) * 100}%`, width: `${((e.to - e.from + 1) / n) * 100}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ───────────── Heatmap ───────────── */

export function HeatmapPanel({ grid }: { grid: number[][] }) {
  return <Heatmap data={grid} format={(v) => formatMoney(v)} />;
}

/* ───────────── Forecast ───────────── */

export function ForecastChart({
  data,
  todayDate,
  bf,
  wipe,
  height = 260,
}: {
  data: ForecastDatum[];
  todayDate: string;
  bf: { from: string; to: string } | null;
  wipe: { at: string } | null;
  height?: number;
}) {
  const label = (value: string, fill: string, row: 0 | 1) => ({ value, position: "insideTopRight" as const, fill, fontSize: 10.5, fontFamily: "var(--font-mono)", dy: row ? -16 : -30, dx: 4 });
  const scale = React.useMemo(() => niceScale(Math.max(maxOf(data, ["actual", "mid"]), ...data.map((d) => d.band?.[1] ?? 0))), [data]);
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 34, right: 18, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke={CHART.grid} />
          <XAxis dataKey="date" tickLine={false} axisLine={false} tick={axisTick} tickFormatter={(v) => formatDateShort(String(v))} minTickGap={28} dy={6} />
          <YAxis tickLine={false} axisLine={false} tick={axisTick} tickFormatter={axisMoney} width={56} domain={scale.domain} ticks={scale.ticks} />
          <Tooltip
            cursor={{ stroke: "rgba(148,166,204,0.25)", strokeWidth: 1 }}
            content={({ active, payload, label: l }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload as ForecastDatum;
              const rows = [] as { label: string; value: string; color?: string }[];
              if (d.actual !== null) rows.push({ label: "Факт", value: formatMoney(d.actual), color: CHART.white });
              if (d.mid !== null && d.actual === null) rows.push({ label: "Прогноз", value: formatMoney(d.mid), color: CHART.azure });
              if (d.band) rows.push({ label: "Диапазон", value: `${axisMoney(d.band[0])} – ${axisMoney(d.band[1])}`, color: "rgba(92,152,255,0.35)" });
              const title = String(l) === todayDate ? `${formatDateShort(String(l))} · сегодня, по темпу` : `${formatWeekday(String(l))}, ${formatDateShort(String(l))}`;
              return <ChartTooltipBox title={title} rows={rows} />;
            }}
          />
          {bf ? <ReferenceArea x1={bf.from} x2={bf.to} fill={CHART.azureStrong} fillOpacity={0.1} stroke="none" ifOverflow="extendDomain" label={label("Чёрная пятница", CHART.azure, 0)} /> : null}
          {wipe ? <ReferenceLine x={wipe.at} stroke={CHART.ice} strokeDasharray="3 3" label={label("Вайп Анархии", CHART.ice, 1)} /> : null}
          <ReferenceLine x={todayDate} stroke="rgba(148,166,204,0.28)" label={{ value: "сегодня", position: "insideTopRight", fill: CHART.axis, fontSize: 10, fontFamily: "var(--font-mono)", dy: -30 }} />
          <Area dataKey="band" stroke="none" fill={CHART.azure} fillOpacity={0.16} isAnimationActive={false} activeDot={false} />
          <Line dataKey="actual" stroke={CHART.white} strokeWidth={1.6} dot={false} isAnimationActive={false} activeDot={{ r: 3, strokeWidth: 2, stroke: "#05070b", fill: CHART.white }} />
          <Line
            dataKey="mid"
            stroke={CHART.azure}
            strokeWidth={1.75}
            strokeDasharray="5 4"
            dot={false}
            isAnimationActive={false}
            activeDot={{ r: 3, strokeWidth: 2, stroke: "#05070b", fill: CHART.azure }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ───────────── Categories ───────────── */

export function CategoryDonut({ items }: { items: { label: string; amount: number; share: number; lineShare: number }[] }) {
  const color = (i: number) => CHART.series[i % CHART.series.length];
  if (!items.length) return <p className="py-6 text-center text-[13px] text-fg-3">Оплат за период нет — категории появятся после первых заказов.</p>;
  return (
    <div>
      {/* one stacked bar instead of a small donut: the table below gets the full card width */}
      <div className="flex h-2 gap-px overflow-hidden rounded-full bg-white/[0.04]" role="img" aria-label="Доли категорий в выручке">
        {items.map((c, i) => (
          <span key={c.label} className="h-full first:rounded-l-full last:rounded-r-full" style={{ width: `${c.share * 100}%`, background: color(i) }} title={`${c.label}: ${formatMoney(c.amount)}`} />
        ))}
      </div>
      <table className="mt-3.5 w-full text-[12.5px]">
        <thead>
          <tr className="text-left">
            <th className="label-mono w-full pb-1.5 text-[9.5px] font-medium text-fg-4">Категория</th>
            <th className="label-mono pb-1.5 text-right text-[9.5px] font-medium text-fg-4">Выручка</th>
            <th className="label-mono pb-1.5 pl-3 text-right text-[9.5px] font-medium text-fg-4">Покупки</th>
          </tr>
        </thead>
        <tbody>
          {items.map((c, i) => (
            <tr key={c.label}>
              <td className="py-[3px] pr-2">
                <span className="flex min-w-0 items-center gap-2">
                  <span aria-hidden className="size-2 shrink-0 rounded-[2px]" style={{ background: color(i) }} />
                  <span className="text-fg-2" title={`${c.label}: ${formatMoney(c.amount)}`}>
                    {c.label}
                  </span>
                </span>
              </td>
              <td className="py-[3px] text-right font-mono whitespace-nowrap text-fg nums">{formatPercent(c.share * 100, { digits: c.share < 0.01 ? 1 : 0 })}</td>
              <td className={cn("py-[3px] pl-3 text-right font-mono whitespace-nowrap nums", c.lineShare > c.share * 1.25 ? "text-ice-300" : "text-fg-3")}>
                {formatPercent(c.lineShare * 100, { digits: c.lineShare < 0.01 ? 1 : 0 })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
