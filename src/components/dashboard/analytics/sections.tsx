import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Lightbulb, TrendingDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { StatusDot } from "@/components/ui/status-dot";
import { Badge } from "@/components/ui/badge";
import { Tooltip } from "@/components/ui/tooltip";
import { Table, TableWrap, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatDate, formatMoney, formatNumber, formatPercent, plural, pluralize } from "@/lib/format";
import { PanelHeader } from "@/components/dashboard/overview/bits";
import { Stat, StatStrip } from "@/components/dashboard/overview/stat-strip";
import type { AnalyticsData, StripKpi } from "./data";

/* ───────────── KPI strip ───────────── */

export function KpiStrip({ items }: { items: StripKpi[] }) {
  return (
    <StatStrip cols="grid-cols-2 sm:grid-cols-3 xl:grid-cols-5">
      {items.map((k, i) => (
        <Stat
          key={k.id}
          label={k.label}
          hint={k.hint}
          value={k.format === "money" ? formatMoney(k.value) : formatPercent(k.value, { digits: k.value < 3 ? 2 : 1 })}
          delta={{ value: k.delta, unit: k.unit, invert: k.invert }}
          sub={k.sub}
          className={cn(i === items.length - 1 && items.length % 2 === 1 && "col-span-2 sm:col-span-1")}
        />
      ))}
    </StatStrip>
  );
}

/* ───────────── Funnel ───────────── */

export function FunnelCard({ funnel, period }: { funnel: AnalyticsData["funnel"]; period: AnalyticsData["period"] }) {
  const max = funnel.steps[0]?.value || 1;
  return (
    <Card className="flex min-w-0 flex-col overflow-hidden">
      <PanelHeader title="Воронка витрины" meta={<span className="truncate text-[11px]">{pluralize(period, ["день", "дня", "дней"])} · shop.arcticmc.ru</span>} />
      <ol className="space-y-3 px-4 pt-4 sm:px-5">
        {funnel.steps.map((s, i) => {
          const worst = s.id === funnel.worstId;
          return (
            <li key={s.id}>
              <div className="flex items-baseline justify-between gap-3 text-[13px]">
                <span className={cn("truncate", worst ? "text-fg" : "text-fg-2")}>{s.label}</span>
                <span className="flex shrink-0 items-baseline gap-3 font-mono nums">
                  {i > 0 ? (
                    <span className={cn("text-[11.5px]", worst ? "text-warn" : "text-fg-3")}>
                      {worst ? <TrendingDown className="mr-1 inline size-3.5 -translate-y-px" /> : null}
                      {formatPercent(s.conv)}
                    </span>
                  ) : null}
                  <span className="w-16 text-right text-[12.5px] text-fg">{formatNumber(s.value)}</span>
                </span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-[3px] bg-white/[0.04]">
                <div
                  className={cn("h-full rounded-[3px]", worst ? "bg-warn/80" : i === funnel.steps.length - 1 ? "bg-ok/80" : "bg-azure-500")}
                  style={{ width: `${Math.max(0.6, (s.value / max) * 100)}%`, opacity: worst ? 1 : 1 - i * 0.1 }}
                />
              </div>
            </li>
          );
        })}
      </ol>
      {funnel.tip ? (
        <div className="mx-4 mt-4 mb-4 rounded-lg border border-warn/20 bg-warn-soft/50 p-3 sm:mx-5">
          <p className="text-[12.5px] leading-snug text-fg-2">{funnel.tip.text}</p>
          <Link href={funnel.tip.href} className="mt-2 inline-flex items-center gap-1 text-[12.5px] font-medium text-azure-300 hover:text-azure-200">
            {funnel.tip.cta} <ArrowRight className="size-3.5" />
          </Link>
        </div>
      ) : null}
    </Card>
  );
}

/* ───────────── Splits ───────────── */

const DOT = { online: "ok", degraded: "warn", offline: "bad" } as const;

export function ServersSplit({ servers }: { servers: AnalyticsData["splits"]["servers"] }) {
  const max = Math.max(...servers.map((s) => s.amount), 1);
  const sorted = [...servers].sort((a, b) => b.amount - a.amount);
  const troubled = servers.filter((s) => s.status !== "online");
  return (
    <Card className="flex min-w-0 flex-col overflow-hidden">
      <PanelHeader
        title="Серверы"
        meta={<span className="text-[11px]">доля выручки</span>}
        actions={
          <Link href="/dashboard/servers" aria-label="Открыть серверы" className="rounded-sm text-fg-4 transition-colors hover:text-fg">
            <ArrowUpRight className="size-3.5" />
          </Link>
        }
      />
      <ul className="space-y-3.5 px-4 py-4 sm:px-5">
        {sorted.map((s) => (
          <li key={s.id}>
            <div className="flex items-center justify-between gap-3 text-[13px]">
              <span className="flex min-w-0 items-center gap-2">
                <StatusDot tone={DOT[s.status]} />
                <span className="truncate text-fg-2">{s.label}</span>
              </span>
              <span className="flex shrink-0 items-baseline gap-2.5 font-mono nums">
                <span className="text-[11.5px] text-fg-3">{formatPercent(s.share * 100)}</span>
                <span className="w-[76px] text-right text-[12.5px] text-fg">{formatMoney(s.amount)}</span>
              </span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.04]">
              <div className="h-full rounded-full bg-azure-500" style={{ width: `${(s.amount / max) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-auto border-t border-line-soft px-4 py-2.5 text-[11.5px] leading-snug text-fg-4 sm:px-5">
        {pluralize(sorted.reduce((a, s) => a + s.count, 0), ["заказ", "заказа", "заказов"])}.{" "}
        {troubled.length
          ? `${troubled.map((s) => s.label).join(" и ")} сейчас ${troubled.length > 1 ? "с проблемами" : "с проблемой"} — выдача копится в очереди.`
          : "Все серверы на связи."}
      </p>
    </Card>
  );
}

const HOLD_TONE: Record<string, string> = { "без холда": "text-ice-300", "холд 24 ч": "text-fg-3", "до 3 дней": "text-warn" };

export function MethodsSplit({ methods }: { methods: AnalyticsData["splits"]["methods"] }) {
  const max = Math.max(...methods.map((m) => m.amount), 1);
  return (
    <Card className="flex min-w-0 flex-col overflow-hidden">
      <PanelHeader title="Способы оплаты" meta={<span className="text-[11px]">и когда деньги доступны</span>} />
      <ul className="space-y-3 px-4 py-4 sm:px-5">
        {methods.map((m) => (
          <li key={m.key}>
            <div className="flex items-center justify-between gap-3 text-[13px]">
              <span className="min-w-0 truncate text-fg-2">
                {m.label} <span className={cn("ml-1 font-mono text-[10.5px]", HOLD_TONE[m.settlement] ?? "text-fg-4")}>{m.settlement}</span>
              </span>
              <span className="flex shrink-0 items-baseline gap-2.5 font-mono nums">
                <span className="text-[11.5px] text-fg-3">{formatPercent(m.share * 100)}</span>
                <span className="w-[76px] text-right text-[12.5px] text-fg">{formatMoney(m.amount)}</span>
              </span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.04]">
              <div className="h-full rounded-full bg-ice-400/80" style={{ width: `${(m.amount / max) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-auto border-t border-line-soft px-4 py-2.5 text-[11.5px] leading-snug text-fg-4 sm:px-5">
        Криптовалюту игрокам из РФ не предлагаем — это запрещено законом.
      </p>
    </Card>
  );
}

export function CountriesTable({ countries }: { countries: AnalyticsData["splits"]["countries"] }) {
  return (
    <Card className="flex min-w-0 flex-col overflow-hidden">
      <PanelHeader title="Страны игроков" meta={<span className="text-[11px]">по оплатам</span>} />
      {countries.length === 0 ? (
        <p className="px-5 py-10 text-center text-[13px] text-fg-3">Оплат за период нет — страны появятся после первых заказов.</p>
      ) : (
        <TableWrap>
          <Table>
            <THead>
              <TR>
                <TH className="w-12">Код</TH>
                <TH>Страна</TH>
                <TH className="text-right">Выручка</TH>
                <TH className="text-right">Доля</TH>
                <TH className="hidden text-right sm:table-cell">Заказы</TH>
              </TR>
            </THead>
            <TBody>
              {countries.map((c) => (
                <TR key={c.key}>
                  <TD className="h-10">
                    <span className="inline-flex h-5 w-7 items-center justify-center rounded-xs border border-line bg-surface-2 font-mono text-[10.5px] text-fg-2">
                      {c.key}
                    </span>
                  </TD>
                  <TD className="h-10">
                    <span className="block text-fg">{c.label}</span>
                    <span className={cn("block text-[11px]", c.key === "RU" ? "text-fg-4" : "text-ice-300/80")}>{c.rails}</span>
                  </TD>
                  <TD className="h-10 text-right font-mono text-fg nums">{formatMoney(c.amount)}</TD>
                  <TD className="h-10 text-right font-mono text-fg-3 nums">{formatPercent(c.share * 100)}</TD>
                  <TD className="hidden h-10 text-right font-mono text-fg-3 nums sm:table-cell">{formatNumber(c.count)}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </TableWrap>
      )}
    </Card>
  );
}

/* ───────────── Cohorts ───────────── */

function cellStyle(p: number) {
  const t = Math.min(1, p / 60);
  return { background: `color-mix(in oklab, #3377ff ${Math.round(10 + t * 72)}%, #0a0d14)` };
}

export function CohortTable({ cohorts }: { cohorts: AnalyticsData["cohorts"] }) {
  const heads: { full: string; short: string }[] = [
    { full: "в тот же месяц", short: "тот же" },
    { full: "+1 мес", short: "+1 мес" },
    { full: "+2 мес", short: "+2 мес" },
    { full: "+3 мес", short: "+3 мес" },
  ];
  return (
    <Card className="flex min-w-0 flex-col overflow-hidden">
      <PanelHeader title="Повторные покупки" meta={<span className="hidden text-[11px] sm:inline">когорты по месяцу первой покупки</span>} />
      <div className="overflow-x-auto px-3 pt-4 pb-2 sm:px-5">
        {/* phone: buyers fold under the month, cells shrink — all four months fit in 360px */}
        <table className="w-full border-separate border-spacing-1 text-[12px] sm:min-w-[520px] sm:text-[13px]">
          <thead>
            <tr>
              <th className="label-mono pb-1 text-left text-[10px] font-medium text-fg-4">
                Когорта<span className="sm:hidden">, покуп.</span>
              </th>
              <th className="label-mono hidden pb-1 text-right text-[10px] font-medium text-fg-4 sm:table-cell">Покупателей</th>
              {heads.map((h) => (
                <th key={h.full} className="label-mono pb-1 text-center text-[10px] font-medium whitespace-nowrap text-fg-4">
                  <span className="sm:hidden">{h.short}</span>
                  <span className="hidden sm:inline">{h.full}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cohorts.rows.map((r, ri) => (
              <tr key={r.month}>
                <td className="pr-1 leading-tight text-fg-2 sm:pr-2">
                  {r.month}
                  {ri === 0 ? <span className="text-fg-4">*</span> : null}
                  <span className="block font-mono text-[10.5px] text-fg-4 nums sm:hidden">{formatNumber(r.size)}</span>
                </td>
                <td className="hidden pr-2 text-right font-mono text-fg-3 nums sm:table-cell">{formatNumber(r.size)}</td>
                {r.cells.map((c, ci) =>
                  c ? (
                    <td key={ci} className="p-0">
                      <Tooltip
                        content={
                          <>
                            {formatNumber(c.count)} из {formatNumber(r.size)} {ci === 0 ? "купили ещё раз в первый месяц" : `купили через ${ci} мес.`}
                            {c.partial ? " · ноябрь ещё идёт" : ""}
                          </>
                        }
                      >
                        <div
                          tabIndex={0}
                          className={cn(
                            "flex h-8 min-w-0 items-center justify-center rounded-[5px] font-mono text-[11px] text-white nums outline-none focus-visible:ring-2 focus-visible:ring-azure-300 sm:h-9 sm:text-[12px]",
                            c.partial && "outline-1 -outline-offset-2 outline-white/35 outline-dashed",
                          )}
                          style={cellStyle(c.pct)}
                        >
                          {formatPercent(c.pct, { digits: 0 })}
                          {c.partial ? <span className="ml-0.5 text-[9px] text-white/60">…</span> : null}
                        </div>
                      </Tooltip>
                    </td>
                  ) : (
                    <td key={ci} className="p-0">
                      <div className="h-8 rounded-[5px] border border-dashed border-line-soft sm:h-9" aria-label="Ещё не наступил" />
                    </td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mx-4 mt-2 grid gap-px overflow-hidden rounded-lg border border-line-soft bg-line-soft sm:mx-5 sm:grid-cols-3">
        <div className="bg-surface-2/60 px-3.5 py-2.5">
          <p className="label-mono text-[10px] text-fg-4">Купили 2+ раза</p>
          <p className="mt-1 font-mono text-[15px] text-fg nums">{formatPercent(cohorts.repeatShare, { digits: 0 })}</p>
          <p className="text-[11px] text-fg-4">всех покупателей</p>
        </div>
        <div className="bg-surface-2/60 px-3.5 py-2.5">
          <p className="label-mono text-[10px] text-fg-4">Вернулись через месяц</p>
          <p className="mt-1 font-mono text-[15px] text-fg nums">{formatPercent(cohorts.nextMonthAvg, { digits: 0 })}</p>
          <p className="text-[11px] text-fg-4">в среднем по закрытым месяцам</p>
        </div>
        <div className="bg-surface-2/60 px-3.5 py-2.5">
          <p className="label-mono text-[10px] text-fg-4">Как читать</p>
          {cohorts.guide ? (
            <p className="mt-1 text-[11.5px] leading-snug text-fg-3">
              Из {formatNumber(cohorts.guide.size)} новых покупателей {cohorts.guide.monthGen}{" "}
              <span className="font-mono text-fg nums">{formatPercent(cohorts.guide.pct, { digits: 0 })}</span> купили снова в следующем месяце
            </p>
          ) : null}
        </div>
      </div>
      <p className="mt-3 border-t border-line-soft px-4 py-2.5 text-[11.5px] leading-snug text-fg-4 sm:px-5">
        * журнал заказов начинается {formatDate(cohorts.logStart, { year: false })} — в августовскую когорту попали и давние покупатели. «…» — месяц ещё
        идёт.
      </p>
    </Card>
  );
}

/* ───────────── Insights ───────────── */

/** A number inside an insight sentence */
function N({ children }: { children: ReactNode }) {
  return <span className="font-mono text-fg nums">{children}</span>;
}

export function InsightsPanel({ insights, heat }: { insights: AnalyticsData["insights"]; heat: AnalyticsData["heatmap"] }) {
  const items: { id: string; tone: "azure" | "warn" | "ice"; text: ReactNode; href: string; cta: string }[] = [];
  if (insights.cases)
    items.push({
      id: "cases",
      tone: "azure",
      text: (
        <>
          Кейсы — <N>{formatPercent(insights.cases.lineShare, { digits: 0 })}</N> покупок, но только <N>{formatPercent(insights.cases.revenueShare, { digits: 0 })}</N>{" "}
          выручки: их берут по одному. Набор ключей ×10 со скидкой поднимет чек.
        </>
      ),
      href: "/dashboard/products/p-keys-10",
      cta: "Набор ключей ×10",
    });
  if (insights.anarchy)
    items.push({
      id: "anarchy",
      tone: "warn",
      text: (
        <>
          Анархия приносит <N>{formatPercent(insights.anarchy.share, { digits: 0 })}</N> выручки, но отвечает медленно и работает на плагине 2.3.0 —{" "}
          {pluralize(insights.anarchy.issues, ["выдача", "выдачи", "выдач"])} с неё сейчас не прошли.
        </>
      ),
      href: "/dashboard/servers",
      cta: "Обновить плагин",
    });
  items.push({
    id: "abroad",
    tone: "ice",
    text: (
      <>
        <N>{formatPercent(insights.abroad.share, { digits: 0 })}</N> выручки — игроки не из России; Казахстан — <N>{formatPercent(insights.abroad.kzShare)}</N> (
        {pluralize(insights.abroad.kzOrders, ["заказ", "заказа", "заказов"])}). Сейчас они платят картами РФ, Kaspi появится скоро.
      </>
    ),
    href: "/dashboard/storefront",
    cta: "Способы оплаты на витрине",
  });
  items.push({
    id: "cart",
    tone: "azure",
    text: (
      <>
        <N>{formatNumber(insights.cart.abandoned)}</N> {plural(insights.cart.abandoned, ["игрок начал", "игрока начали", "игроков начали"])} оплату и{" "}
        {plural(insights.cart.abandoned, ["бросил", "бросили", "бросили"])} (<N>{formatPercent(insights.cart.rate, { digits: 0 })}</N>). «Вернуть в корзину» с запуска
        вернула <N>{formatNumber(insights.cart.recovered)}</N> {plural(insights.cart.recovered, ["покупку", "покупки", "покупок"])} на{" "}
        <N>{formatMoney(insights.cart.revenue)}</N>. Пик покупок — {heat.peak}.
      </>
    ),
    href: "/dashboard/campaigns",
    cta: "Кампании в игре",
  });

  return (
    <Card className="flex min-w-0 flex-col overflow-hidden">
      <PanelHeader
        title="Выводы"
        meta={
          <Badge tone="neutral" className="gap-1">
            <Lightbulb className="size-3" /> из данных периода
          </Badge>
        }
      />
      <ol className="divide-y divide-line-soft">
        {items.map((it, i) => (
          <li key={it.id} className="flex gap-3 px-4 py-3.5 sm:px-5">
            <span
              className={cn(
                "mt-0.5 font-mono text-[11px] nums",
                it.tone === "warn" ? "text-warn" : it.tone === "ice" ? "text-ice-300" : "text-azure-300",
              )}
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            <div className="min-w-0">
              <p className="text-[13px] leading-[1.5] text-fg-2">{it.text}</p>
              <Link href={it.href} className="mt-1.5 inline-flex items-center gap-1 text-[12.5px] font-medium text-azure-300 transition-colors hover:text-azure-200">
                {it.cta} <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}
