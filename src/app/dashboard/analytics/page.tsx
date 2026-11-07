import type { Metadata } from "next";
import Link from "next/link";
import { CalendarRange } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatDateShort, formatMoney, formatPercent, pluralize } from "@/lib/format";
import { mskDayStart } from "@/lib/mock";
import { PanelHeader } from "@/components/dashboard/overview/bits";
import { buildAnalytics, parsePeriod } from "@/components/dashboard/analytics/data";
import { ExportCsvButton, PeriodSwitch } from "@/components/dashboard/analytics/controls";
import { CategoryDonut, ForecastChart, HeatmapPanel, RevenueOnlineChart } from "@/components/dashboard/analytics/charts";
import {
  CohortTable,
  CountriesTable,
  FunnelCard,
  InsightsPanel,
  KpiStrip,
  MethodsSplit,
  ServersSplit,
} from "@/components/dashboard/analytics/sections";

export const metadata: Metadata = { title: "Аналитика" };

export default async function AnalyticsPage({ searchParams }: PageProps<"/dashboard/analytics">) {
  const period = parsePeriod((await searchParams).period);
  const a = buildAnalytics(period);
  const todayIso = new Date(mskDayStart(0)).toISOString();

  return (
    <>
      <PageHeader
        title="Аналитика"
        description="Выручка в контексте онлайна: что растёт, когда покупают и чего ждать дальше"
        meta={
          <span className="font-mono text-[11.5px] text-fg-3 nums">
            {formatDateShort(a.range.from)} — {formatDateShort(a.range.to)} · сравнение с {formatDateShort(a.range.prevFrom)} — {formatDateShort(a.range.prevTo)}
          </span>
        }
        actions={
          <>
            <PeriodSwitch period={period} />
            <ExportCsvButton rows={a.csv} period={period} />
          </>
        }
      />

      <KpiStrip items={a.strip} />

      {/* Signature: revenue × online */}
      <Card className="mt-4 overflow-hidden">
        <PanelHeader
          title="Выручка × онлайн"
          meta={<span className="hidden text-[11px] sm:inline">столбцы — выручка за день, линия — пиковый онлайн</span>}
          actions={
            <ul className="flex items-center gap-3 text-[11.5px] text-fg-3" aria-label="Легенда">
              <li className="flex items-center gap-1.5">
                <span aria-hidden className="size-2 rounded-[2px] bg-azure-500" /> Выручка
              </li>
              <li className="flex items-center gap-1.5">
                <span aria-hidden className="h-[2px] w-3 rounded-full bg-ice-400" /> Онлайн
              </li>
            </ul>
          }
        />
        <div className="px-2 pt-2 sm:px-3">
          <RevenueOnlineChart data={a.combo.data} events={a.combo.events} height={272} />
        </div>
        <p className="flex items-start gap-2.5 border-t border-line-soft px-4 py-3 text-[13px] leading-snug text-fg-2 sm:px-5">
          <span className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", a.combo.insight.tone === "ok" ? "bg-ok" : "bg-warn")} aria-hidden />
          {a.combo.insight.text}
        </p>
      </Card>

      <div className="mt-4 grid gap-4 xl:grid-cols-12">
        <Card className="flex min-w-0 flex-col overflow-hidden xl:col-span-7">
          <PanelHeader
            title="Когда покупают"
            meta={<span className="truncate text-[11px]">по часам МСК · {pluralize(a.heatmap.span, ["день", "дня", "дней"])}</span>}
          />
          <div className="px-4 pt-4 pb-3 sm:px-5">
            <HeatmapPanel grid={a.heatmap.grid} />
          </div>
          <div className="mt-auto grid gap-px border-t border-line-soft bg-line-soft sm:grid-cols-3">
            <div className="bg-surface px-4 py-3 sm:px-5">
              <p className="label-mono text-fg-4">Пик</p>
              <p className="mt-1 text-[13px] text-fg first-letter:uppercase">{a.heatmap.peak}</p>
              <p className="mt-0.5 font-mono text-[11px] text-fg-3 nums">{formatPercent(a.heatmap.peakShare)} недели за 2 часа</p>
            </div>
            <div className="bg-surface px-4 py-3 sm:px-5">
              <p className="label-mono text-fg-4">Вечер 18–24</p>
              <p className="mt-1 font-mono text-[13px] text-fg nums">{formatPercent(a.heatmap.eveningShare, { digits: 0 })} выручки</p>
              <p className="mt-0.5 text-[11px] text-fg-3">лучший день — {a.heatmap.bestDay}</p>
            </div>
            <div className="bg-surface px-4 py-3 sm:px-5">
              <p className="label-mono text-fg-4">Совет</p>
              <p className="mt-1 text-[13px] text-fg">Запускайте акции {a.heatmap.launchAt}</p>
              <Link href="/dashboard/calendar" className="mt-0.5 inline-flex items-center gap-1 text-[11.5px] text-azure-300 hover:text-azure-200">
                <CalendarRange className="size-3" /> В календарь акций
              </Link>
            </div>
          </div>
        </Card>
        <div className="min-w-0 xl:col-span-5 [&>*]:h-full">
          <FunnelCard funnel={a.funnel} period={a.period} />
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-12">
        <Card className="flex min-w-0 flex-col overflow-hidden xl:col-span-8">
          <PanelHeader title="Прогноз на 30 дней" meta={<span className="hidden text-[11px] sm:inline">по тренду, дням недели и календарю акций</span>} />
          <div className="flex flex-wrap items-end gap-x-8 gap-y-3 px-4 pt-4 sm:px-5">
            <div>
              <p className="label-mono text-fg-4">Ожидаем</p>
              <p className="mt-1 font-mono text-[26px] leading-none font-semibold tracking-[-0.03em] text-fg nums">
                ≈ {formatMoney(a.forecast.total.mid)}
                <span className="ml-2 text-[13px] font-normal tracking-normal text-fg-3">± {formatPercent(a.forecast.total.spread, { digits: 0 })}</span>
              </p>
              <p className="mt-1 font-mono text-[11px] text-fg-4 nums">
                от {formatMoney(a.forecast.total.low)} до {formatMoney(a.forecast.total.high)}
              </p>
            </div>
            {a.forecast.markers.bf ? (
              <div>
                <p className="label-mono text-azure-300">Чёрная пятница · 27–30.11</p>
                <p className="mt-1 font-mono text-[15px] text-fg nums">≈ {formatMoney(a.forecast.markers.bf.sum)}</p>
                <p className="mt-0.5 text-[11px] text-fg-4">за 4 дня, промокод включится сам</p>
              </div>
            ) : null}
            {a.forecast.markers.wipe ? (
              <div>
                <p className="label-mono text-ice-300">Вайп Анархии · 01.12</p>
                <p className="mt-1 font-mono text-[15px] text-fg nums">≈ {formatMoney(a.forecast.markers.wipe.value)}</p>
                <p className="mt-0.5 text-[11px] text-fg-4">{formatPercent(a.forecast.markers.wipe.vsUsual, { digits: 0, signed: true })} к обычному дню</p>
              </div>
            ) : null}
          </div>
          <div className="mt-2 px-2 pb-2 sm:px-3">
            <ForecastChart
              data={a.forecast.data}
              todayDate={todayIso}
              bf={a.forecast.markers.bf ? { from: a.forecast.markers.bf.from, to: a.forecast.markers.bf.to } : null}
              wipe={a.forecast.markers.wipe ? { at: a.forecast.markers.wipe.at } : null}
              height={300}
            />
          </div>
          <ul className="mt-auto flex flex-wrap gap-x-5 gap-y-1.5 border-t border-line-soft px-4 py-2.5 text-[11.5px] text-fg-3 sm:px-5" aria-label="Легенда">
            <li className="flex items-center gap-1.5">
              <span aria-hidden className="h-[2px] w-3.5 rounded-full bg-fg" /> Факт за 14 дней
            </li>
            <li className="flex items-center gap-1.5">
              <span aria-hidden className="h-0 w-3.5 border-t border-dashed border-azure-400" /> Прогноз
            </li>
            <li className="flex items-center gap-1.5">
              <span aria-hidden className="h-2 w-3.5 rounded-[2px] bg-azure-400/25" /> Диапазон
            </li>
          </ul>
        </Card>
        <div className="min-w-0 xl:col-span-4 [&>*]:h-full">
          <InsightsPanel insights={a.insights} heat={a.heatmap} />
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card className="flex min-w-0 flex-col overflow-hidden">
          <PanelHeader title="Категории" meta={<span className="text-[11px]">доля выручки</span>} />
          <div className="px-4 py-4 sm:px-5">
            <CategoryDonut items={a.splits.categories} />
          </div>
          <p className="mt-auto border-t border-line-soft px-4 py-2.5 text-[11.5px] leading-snug text-fg-4 sm:px-5">
            <span className="text-ice-300">Голубым</span> — категории, которые покупают чаще, чем они весят в выручке: дешёвые позиции, на них
            растёт средний чек.
          </p>
        </Card>
        <ServersSplit servers={a.splits.servers} />
        <div className="min-w-0 md:col-span-2 xl:col-span-1 [&>*]:h-full">
          <MethodsSplit methods={a.splits.methods} />
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-12">
        <div className="min-w-0 xl:col-span-5 [&>*]:h-full">
          <CountriesTable countries={a.splits.countries} />
        </div>
        <div className="min-w-0 xl:col-span-7 [&>*]:h-full">
          <CohortTable cohorts={a.cohorts} />
        </div>
      </div>
    </>
  );
}
