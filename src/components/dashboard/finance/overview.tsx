"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Info, Landmark, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate, formatDateShort, formatMoney, formatMoneyCompact, formatNumber, formatPercent, formatTime, formatWeekday } from "@/lib/format";
import { AreaTrend } from "@/components/charts";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatusDot } from "@/components/ui/status-dot";
import { Tooltip } from "@/components/ui/tooltip";
import type { FinanceData, FinanceMember } from "./types";

function hoursMinutes(ms: number) {
  const totalMin = Math.max(0, Math.round(ms / 60_000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h} ч ${String(m).padStart(2, "0")} мин`;
}

export function FinanceOverview({
  data,
  available,
  members,
  onWithdraw,
  onOpenTab,
}: {
  data: FinanceData;
  available: number;
  members: FinanceMember[];
  onWithdraw: () => void;
  onOpenTab: (tab: string) => void;
}) {
  const { balance } = data;
  return (
    <div className="space-y-4">
      <BalanceStrip
        items={[
          {
            label: "Доступно к выплате",
            value: formatMoney(available),
            hint: "СБП без холда + остаток прошлых дней",
            tip: "Можно вывести прямо сейчас за 0,5 % или дождаться плановой выплаты в 12:00 — бесплатно.",
            action: (
              <button type="button" onClick={onWithdraw} className="font-medium text-azure-300 transition-colors hover:text-azure-200">
                Вывести
              </button>
            ),
            accent: true,
          },
          {
            label: "В холде",
            value: formatMoney(balance.pending),
            hint: "карты — 24 ч, СБП — без холда",
            tip: "Платежи картой, SberPay, T-Pay и ЮMoney становятся доступны через 24 часа — так банки страхуют от мошенничества.",
          },
          {
            label: "Резерв на чарджбэки",
            value: formatMoney(balance.reserved),
            hint: "только карты, не растёт без споров",
            tip: "Фиксированный резерв на случай оспаривания платежа картой. СБП-платежи не оспариваются, резерв с них не берётся.",
          },
          {
            label: "Оборот сегодня",
            value: formatMoney(balance.todayGross),
            hint: `с 00:00 МСК · ${data.ordersToday} ${data.ordersToday % 10 === 1 && data.ordersToday % 100 !== 11 ? "заказ" : "заказов"}`,
            tip: "Сумма, которую заплатили игроки сегодня, до комиссии.",
          },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-12">
        <NextPayoutCard data={data} members={members} onWithdraw={onWithdraw} onOpenTab={onOpenTab} className="min-w-0 lg:col-span-7" />
        <RouteCard data={data} onOpenTab={onOpenTab} className="min-w-0 lg:col-span-5" />
        <NetIncomeCard data={data} className="min-w-0 lg:col-span-7" />
        <FeeTierCard data={data} className="min-w-0 lg:col-span-5" />
      </div>
    </div>
  );
}

/* ───────────── Balance strip ───────────── */

function BalanceStrip({
  items,
}: {
  items: { label: string; value: string; hint: string; tip: string; action?: React.ReactNode; accent?: boolean }[];
}) {
  return (
    <dl className="grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-line bg-line-soft min-[480px]:grid-cols-2 xl:grid-cols-4">
      {items.map((it) => (
        <div key={it.label} className={cn("relative bg-surface px-5 py-4", it.accent && "bg-[linear-gradient(180deg,rgb(51_119_255/0.07),transparent_70%)]")}>
          {it.accent ? <span aria-hidden className="absolute inset-x-0 top-0 h-px bg-azure-500/60" /> : null}
          <dt className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 label-mono text-fg-3">
              {it.label}
              <Tooltip content={it.tip}>
                <button type="button" aria-label={`Что такое «${it.label}»`} className="rounded-xs text-fg-4 transition-colors hover:text-fg-2">
                  <Info className="size-3.5" />
                </button>
              </Tooltip>
            </span>
            {it.action ? <span className="text-[12.5px]">{it.action}</span> : null}
          </dt>
          <dd className="mt-2 font-mono text-[26px] leading-none font-medium tracking-[-0.03em] text-fg nums">{it.value}</dd>
          <dd className="mt-2 text-[12.5px] text-fg-3">{it.hint}</dd>
        </div>
      ))}
    </dl>
  );
}

/* ───────────── Next payout ───────────── */

function NextPayoutCard({
  data,
  members,
  onWithdraw,
  onOpenTab,
  className,
}: {
  data: FinanceData;
  members: FinanceMember[];
  onWithdraw: () => void;
  onOpenTab: (tab: string) => void;
  className?: string;
}) {
  const { nextPayout, todayPayout } = data;
  const split = members.filter((m) => m.splitPct > 0);
  const rail = [
    { time: formatTime(data.now), label: "сейчас", state: "done" as const },
    { time: "00:00", label: "день закрыт", state: "next" as const },
    { time: formatTime(nextPayout.at), label: "выплата", state: "next" as const },
    { time: "≈ 12:02", label: "на картах", state: "next" as const },
  ];
  return (
    <section className={cn("rounded-xl border border-line bg-surface shadow-raise", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-4">
        <div>
          <p className="label-mono text-fg-3">Следующая выплата</p>
          <h2 className="mt-2 text-[22px] leading-tight font-semibold tracking-[-0.025em] text-fg">
            Завтра в {formatTime(nextPayout.at)} МСК
          </h2>
          <p className="mt-1 text-[13px] text-fg-3">
            {formatWeekday(nextPayout.at)}, {formatDate(nextPayout.at, { year: false })} · через{" "}
            <span className="font-mono text-fg-2 nums">{hoursMinutes(nextPayout.inMs)}</span>
          </p>
        </div>
        <div className="text-left sm:text-right">
          <p className="label-mono text-fg-3">Прогноз</p>
          <p className="mt-2 font-mono text-[22px] leading-tight font-medium tracking-[-0.02em] text-fg nums">
            ≈ {formatMoney(Math.round(nextPayout.estimate / 100) * 100)}
          </p>
          <p className="mt-1 text-[12px] text-fg-3">после комиссии 3,9 %</p>
        </div>
      </div>

      <p className="mt-3 px-5 text-[12.5px] leading-relaxed text-fg-3">
        Уже заработано сегодня <span className="font-mono text-fg-2 nums">{formatMoney(nextPayout.earnedToday)}</span>, до полуночи ждём ещё ≈{" "}
        <span className="font-mono text-fg-2 nums">{formatMoney(Math.round(nextPayout.expectedRest / 100) * 100)}</span> — по среднему за 4 недели,
        вечерний пик учтён.
      </p>

      {/* timeline rail */}
      <ol className="mx-5 mt-4 grid grid-cols-4 border-t border-line-soft pt-3" aria-label="Как идёт выплата">
        {rail.map((r, i) => (
          <li key={r.label} className="relative pr-2">
            <span
              aria-hidden
              className={cn(
                "absolute -top-[17px] left-0 size-2 rounded-full ring-4 ring-surface",
                i === 0 ? "bg-azure-400" : i === 2 ? "bg-white" : "bg-fg-4",
              )}
            />
            <span className="block font-mono text-[12px] text-fg-2 nums">{r.time}</span>
            <span className="block text-[11.5px] text-fg-3">{r.label}</span>
          </li>
        ))}
      </ol>

      <div className="mx-5 mt-4 grid gap-2 sm:grid-cols-3">
        {split.map((m) => (
          <div key={m.id} className="flex items-center gap-2.5 rounded-lg border border-line-soft bg-surface-2/60 px-3 py-2">
            <Avatar name={m.name} size={24} />
            <div className="min-w-0">
              <p className="truncate text-[12.5px] text-fg-2">
                {m.name.split(" ")[0]} <span className="font-mono text-fg-4">{m.splitPct} %</span>
              </p>
              <p className="font-mono text-[13px] text-fg nums">≈ {formatMoney(Math.round((nextPayout.estimate * m.splitPct) / 100))}</p>
            </div>
          </div>
        ))}
      </div>

      <RecentPayoutBars data={data} />

      <div className="mt-4 flex flex-col gap-3 border-t border-line-soft px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
        {todayPayout ? (
          <p className="flex items-center gap-2 text-[12.5px] text-fg-3">
            <StatusDot tone="azure" pulse />
            Сегодня в {formatTime(todayPayout.createdAt)} отправлено{" "}
            <span className="font-mono text-fg-2 nums">{formatMoney(todayPayout.amount)}</span> — в пути
          </p>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => onOpenTab("split")}>
            Распределение
          </Button>
          <Button variant="primary" size="sm" onClick={onWithdraw}>
            Вывести сейчас
            <ArrowUpRight />
          </Button>
        </div>
      </div>
    </section>
  );
}

/** Last 14 daily payouts as tiny bars — the failed one is marked, its retry is merged in. */
function RecentPayoutBars({ data }: { data: FinanceData }) {
  const list = data.payouts.filter((p) => !p.retryOf).slice(0, 14).reverse();
  const max = Math.max(...list.map((p) => p.amount), 1);
  return (
    <div className="mx-5 mt-5">
      <div className="flex items-center justify-between">
        <p className="label-mono text-fg-3">Последние 14 выплат</p>
        <p className="font-mono text-[11.5px] text-fg-3 nums">в среднем {formatMoney(list.reduce((a, p) => a + p.amount, 0) / (list.length || 1))}</p>
      </div>
      <div className="mt-2.5 flex h-16 items-end gap-1" role="list">
        {list.map((p) => (
          <Tooltip
            key={p.id}
            content={
              <span className="font-mono nums">
                {formatDateShort(p.createdAt)} · {formatMoney(p.amount)}
                {p.status === "failed" ? " · повтор через Точку" : p.status === "processing" ? " · в пути" : ""}
              </span>
            }
          >
            <span
              role="listitem"
              tabIndex={0}
              aria-label={`${formatDateShort(p.createdAt)}: ${formatMoney(p.amount)}`}
              className={cn(
                "relative flex-1 rounded-t-[3px] transition-opacity outline-none hover:opacity-100 focus-visible:opacity-100",
                p.status === "failed" ? "bg-warn/70" : p.status === "processing" ? "bg-ice-400" : "bg-azure-500/70 hover:bg-azure-400",
              )}
              style={{ height: `${Math.max(8, (p.amount / max) * 100)}%` }}
            />
          </Tooltip>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between font-mono text-[10.5px] text-fg-4">
        <span>{list[0] ? formatDateShort(list[0].createdAt) : ""}</span>
        <span className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="size-1.5 rounded-[1px] bg-warn/70" /> повтор
          </span>
          <span className="flex items-center gap-1">
            <span className="size-1.5 rounded-[1px] bg-ice-400" /> в пути
          </span>
        </span>
        <span>сегодня</span>
      </div>
    </div>
  );
}

/* ───────────── Payout route ───────────── */

function RouteCard({ data, onOpenTab, className }: { data: FinanceData; onOpenTab: (tab: string) => void; className?: string }) {
  const inc = data.incident;
  return (
    <section className={cn("flex flex-col rounded-xl border border-line bg-surface shadow-raise", className)}>
      <div className="flex items-start justify-between gap-3 px-5 pt-4">
        <div>
          <p className="label-mono text-fg-3">Маршрут выплат</p>
          <h2 className="mt-2 text-[15px] font-semibold tracking-[-0.015em] text-fg">Два банка, переключение само</h2>
        </div>
        <Badge tone="ok" dot>
          работает
        </Badge>
      </div>

      <ol className="relative mx-5 mt-4 space-y-3 before:absolute before:top-2 before:bottom-2 before:left-[5px] before:w-px before:bg-line-strong">
        <RouteNode tone="azure" title="PayMC" sub="собрали выручку за день, вычли комиссию" />
        <li className="relative pl-6">
          <span aria-hidden className="absolute top-1.5 left-0 size-[11px] rounded-full border-2 border-ok bg-surface" />
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-[13px] font-medium text-fg">Т-Банк</span>
            <span className="label-mono text-fg-4">основной</span>
            <span className="font-mono text-[11.5px] text-ok">99,9 % за 90 дней</span>
          </div>
          <div className="relative mt-2 ml-1 rounded-md border border-dashed border-line-strong px-3 py-2">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="text-[13px] text-fg-2">Точка</span>
              <span className="label-mono text-fg-4">резервный</span>
              <span className="font-mono text-[11.5px] text-fg-3">в ожидании</span>
            </div>
          </div>
        </li>
        <RouteNode tone="white" title="3 получателя" sub="СБП и карта Мир, по долям распределения" />
      </ol>

      <p className="mx-5 mt-4 text-[12.5px] leading-relaxed text-fg-3">
        Если основной банк не принял перевод, выплата уходит резервным маршрутом автоматически. Писать в поддержку не нужно.
      </p>

      {inc ? (
        <div className="mx-5 mt-3 mb-4 rounded-lg border border-line-soft bg-surface-2/60">
          <div className="flex items-center justify-between gap-2 border-b border-line-soft px-3 py-2">
            <span className="label-mono text-fg-3">Случай {formatDateShort(inc.failedAt)}</span>
            <span className="font-mono text-[12px] text-fg-2 nums">{formatMoney(inc.amount)}</span>
          </div>
          <ol className="space-y-1.5 px-3 py-2.5 text-[12.5px]">
            <li className="grid grid-cols-[44px_1fr] gap-2">
              <span className="font-mono text-bad nums">{formatTime(inc.failedAt)}</span>
              <span className="text-fg-2">Т-Банк не принял перевод: банк получателя временно не принимал СБП-переводы</span>
            </li>
            <li className="grid grid-cols-[44px_1fr] gap-2">
              <span className="font-mono text-warn nums">{formatTime(inc.retryAt)}</span>
              <span className="text-fg-2">Отправили резервным маршрутом через Точку</span>
            </li>
            <li className="grid grid-cols-[44px_1fr] gap-2">
              <span className="font-mono text-ok nums">{formatTime(inc.paidAt)}</span>
              <span className="text-fg-2">Зачислено всем трём получателям</span>
            </li>
          </ol>
          <button
            type="button"
            onClick={() => onOpenTab("payouts")}
            className="flex w-full items-center justify-between border-t border-line-soft px-3 py-2 text-[12.5px] text-fg-3 transition-colors hover:bg-white/[0.02] hover:text-fg-2"
          >
            Открыть в истории выплат
            <ArrowRight className="size-3.5" />
          </button>
        </div>
      ) : null}
    </section>
  );
}

function RouteNode({ tone, title, sub }: { tone: "azure" | "white"; title: string; sub: string }) {
  return (
    <li className="relative pl-6">
      <span aria-hidden className={cn("absolute top-1.5 left-0 size-[11px] rounded-full ring-4 ring-surface", tone === "azure" ? "bg-azure-500" : "bg-white")} />
      <p className="text-[13px] font-medium text-fg">{title}</p>
      <p className="text-[12px] text-fg-3">{sub}</p>
    </li>
  );
}

/* ───────────── Net income chart ───────────── */

function NetIncomeCard({ data, className }: { data: FinanceData; className?: string }) {
  const total = data.dailyNet.reduce((a, d) => a + d.net, 0);
  const best = data.dailyNet.reduce((a, d) => (d.net > a.net ? d : a), data.dailyNet[0]);
  const series = data.dailyNet.map((d) => ({ date: d.date, net: d.net }));
  return (
    <section className={cn("rounded-xl border border-line bg-surface shadow-raise", className)}>
      <div className="flex flex-wrap items-end justify-between gap-3 px-5 pt-4">
        <div>
          <p className="label-mono text-fg-3">Чистый доход · 30 дней</p>
          <p className="mt-2 font-mono text-[22px] leading-none font-medium tracking-[-0.02em] text-fg nums">{formatMoney(total)}</p>
        </div>
        <p className="text-[12.5px] text-fg-3">
          Лучший день — {formatDateShort(best.date)}: <span className="font-mono text-fg-2 nums">{formatMoney(best.net)}</span>
        </p>
      </div>
      <AreaTrend
        className="mt-3 px-2 pb-3"
        height={190}
        data={series}
        xKey="date"
        series={[{ key: "net", label: "Чистыми" }]}
        formatX={(v) => formatDateShort(String(v))}
        formatY={(v) => (v >= 1000 ? `${formatNumber(Math.round(v / 1000))} тыс` : formatNumber(v))}
        formatValue={(v) => formatMoney(v)}
        formatTitle={(v) => `${formatWeekday(String(v))}, ${formatDate(String(v), { year: false })}`}
      />
    </section>
  );
}

/* ───────────── Fee tier ───────────── */

function FeeTierCard({ data, className }: { data: FinanceData; className?: string }) {
  const { tier } = data;
  const pctOf = (v: number) => Math.min(100, (v / tier.next) * 100);
  return (
    <section className={cn("flex flex-col rounded-xl border border-line bg-surface shadow-raise", className)}>
      <div className="flex items-start justify-between gap-3 px-5 pt-4">
        <div>
          <p className="label-mono text-fg-3">Комиссия</p>
          <h2 className="mt-2 text-[15px] font-semibold tracking-[-0.015em] text-fg">
            {tier.label} · {formatPercent(tier.rate)}
          </h2>
        </div>
        <Badge tone="azure">
          <ShieldCheck />
          всё включено
        </Badge>
      </div>

      <dl className="mx-5 mt-4 grid grid-cols-2 gap-3">
        <div>
          <dt className="text-[12px] text-fg-3">Оборот в ноябре</dt>
          <dd className="mt-0.5 font-mono text-[15px] text-fg nums">{formatMoney(tier.monthTurnover)}</dd>
        </div>
        <div>
          <dt className="text-[12px] text-fg-3">Прогноз на месяц</dt>
          <dd className="mt-0.5 font-mono text-[15px] text-fg-2 nums">≈ {formatMoneyCompact(tier.monthForecast)}</dd>
        </div>
      </dl>

      <div className="mx-5 mt-4">
        <div className="relative h-2 rounded-full bg-white/[0.06]" role="img" aria-label={`Оборот ${formatMoney(tier.monthTurnover)} из ${formatMoneyCompact(tier.next)}`}>
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-[repeating-linear-gradient(135deg,rgb(92_152_255/0.35)_0_4px,transparent_4px_8px)]"
            style={{ width: `${pctOf(tier.monthForecast)}%` }}
          />
          <div className="absolute inset-y-0 left-0 rounded-full bg-azure-500" style={{ width: `${pctOf(tier.monthTurnover)}%` }} />
          <span aria-hidden className="absolute -top-1 -bottom-1 w-px bg-fg-2" style={{ left: `${pctOf(tier.floor)}%` }} />
        </div>
        <div className="relative mt-1.5 h-8 font-mono text-[10.5px] text-fg-4">
          <span className="absolute left-0">0</span>
          <span className="absolute -translate-x-1/2 text-center text-fg-3" style={{ left: `${pctOf(tier.floor)}%` }}>
            500 тыс
            <br />
            <span className="text-fg-4">{tier.label}</span>
          </span>
          <span className="absolute right-0 text-right text-fg-3">
            3 млн
            <br />
            <span className="text-fg-4">
              {tier.nextLabel} · {formatPercent(tier.nextRate)}
            </span>
          </span>
        </div>
      </div>

      <p className="mx-5 mt-2 text-[12.5px] leading-relaxed text-fg-3">
        Ставка выбирается сама по обороту месяца. Эквайринг, чеки, выплаты и антифрод — внутри неё, абонентской платы нет.
      </p>

      <div className="mt-auto flex flex-col gap-2 border-t border-line-soft px-5 py-3 pt-3 text-[12.5px] sm:flex-row sm:items-center sm:justify-between">
        <span className="text-fg-3">
          За октябрь: <span className="font-mono text-fg-2 nums">{formatMoney(tier.prevMonthFee)}</span>, на базовой ставке было бы на{" "}
          <span className="font-mono text-ok nums">{formatMoney(tier.savedVsStart)}</span> больше
        </span>
        <Link href="/#pricing" className="inline-flex shrink-0 items-center gap-1 text-azure-300 transition-colors hover:text-azure-200">
          <Landmark className="size-3.5" />
          Тарифы
        </Link>
      </div>
    </section>
  );
}
