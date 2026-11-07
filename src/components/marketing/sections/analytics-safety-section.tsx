import type { ReactNode } from "react";
import { CALENDAR, FORECAST, NOW_MS, DAY, getDailySeries, getKpis, getOrders, getPlayerByName, getPlayers, getProduct, pct } from "@/lib/mock";
import { formatDate, formatDateShort, formatMoney, formatNumber, formatPercent, formatWeekday, typo } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Section, SectionHeading } from "@/components/marketing/section";
import { Delta } from "@/components/ui/delta";
import { RevenueChart, type RevenuePoint } from "@/components/marketing/landing-b/revenue-chart";
import { RulesCheck } from "@/components/marketing/landing-b/rules-check";

function riskTone(r: number) {
  return r >= 80 ? "bad" : r >= 35 ? "warn" : "ok";
}

export function AnalyticsSafetySection() {
  // 30 full days: today is still in progress and would read as a drop
  const series = getDailySeries(31).slice(0, 30);
  const data: RevenuePoint[] = series.map((d) => ({
    day: formatDateShort(d.date),
    title: `${formatWeekday(d.date)}, ${formatDate(d.date, { year: false })}`,
    revenue: d.revenue,
    online: d.peakOnline,
  }));
  const k = getKpis(30);
  const forecastMid = FORECAST.reduce((a, f) => a + f.mid, 0);
  const forecastLow = FORECAST.reduce((a, f) => a + f.low, 0);
  const forecastHigh = FORECAST.reduce((a, f) => a + f.high, 0);
  const windowStart = NOW_MS - 30 * DAY;
  const events = CALENDAR.filter((e) => Date.parse(e.start) >= windowStart && Date.parse(e.start) <= NOW_MS && e.kind !== "holiday").slice(0, 2);

  // anti-fraud examples from real player records
  const flagged = getPlayers({ flagged: true, sort: "risk" });
  const blocked = flagged.find((p) => p.flags.includes("network_blacklist")) ?? flagged[0];
  const checked =
    flagged.find((p) => p !== blocked && !p.flags.includes("network_blacklist") && (p.flags.includes("vpn") || p.flags.includes("many_cards"))) ??
    flagged.find((p) => p !== blocked);
  const regular = getPlayerByName("kotik228");
  const riskRows = [
    regular ? { name: regular.name, risk: regular.risk, verdict: "пропущен" } : null,
    checked ? { name: checked.name, risk: checked.risk, verdict: "3-D Secure" } : null,
    blocked ? { name: blocked.name, risk: blocked.risk, verdict: "отклонён" } : null,
  ].filter((r): r is { name: string; risk: number; verdict: string } => Boolean(r));

  // rollback example from a real chargeback in the order log: the rank's own delivery command, reversed
  const chargeback = getOrders({ status: "chargeback" })[0];
  const cbProduct = chargeback ? getProduct(chargeback.items[0]?.productId ?? "") : undefined;
  const cbGroup = cbProduct?.commands.map((c) => c.template.match(/parent addtemp (\S+)/)?.[1]).find(Boolean);
  const rollback =
    chargeback && cbProduct && cbGroup
      ? { player: chargeback.playerName, group: cbGroup, note: `спор по ${chargeback.id} · ${cbProduct.name} · ${formatMoney(chargeback.amount)}` }
      : { player: checked?.name ?? "player", group: "frost", note: "спор по карте · Frost" };

  const metrics = [
    {
      label: "₽ на игрока онлайн",
      value: formatMoney(k.revenuePerOnline),
      delta: pct(k.revenuePerOnline, k.revenuePerOnlinePrev),
      note: "Выручка за 30 дней на средний пиковый онлайн. Главная метрика сервера: растёт, даже когда онлайн стоит на месте.",
    },
    {
      label: "Игроки → покупатели",
      value: formatPercent(k.conversion),
      delta: pct(k.conversion, k.conversionPrev),
      note: `${formatNumber(k.buyers)} покупателей за 30 дней. Считаем по уникальным игрокам, а не по визитам витрины.`,
    },
    {
      label: "Прогноз на 30 дней",
      value: formatMoney(forecastMid),
      delta: null,
      note: `Коридор ${formatMoney(forecastLow)} – ${formatMoney(forecastHigh)}. Учтены выходные, Чёрная пятница и вайп Анархии 1 декабря.`,
    },
  ];

  return (
    <Section id="safety">
      <SectionHeading
        index="03"
        eyebrow="Аналитика и защита"
        title="Видно, что работает."
        muted={"Выручка\u00a0— рядом с онлайном"}
        lead="Деньги без онлайна ничего не говорят. В кабинете выручка, онлайн и кампании лежат на одной оси — понятно, что подняло день: вайп, акция или блогер."
      />

      <div className="grid gap-4 lg:grid-cols-12">
        <div className="min-w-0 rounded-xl border border-line bg-surface lg:col-span-8">
          <div className="flex flex-wrap items-start justify-between gap-4 px-5 pt-5">
            <div>
              <p className="label-mono text-fg-4">ArcticMC · 30 дней</p>
              <p className="mt-1.5 flex items-baseline gap-2.5 font-mono text-[26px] font-medium tracking-[-0.02em] text-fg nums">
                {formatMoney(k.revenue)}
                <Delta value={pct(k.revenue, k.revenuePrev)} />
              </p>
            </div>
            <ul className="flex items-center gap-4 pt-1 text-[12px] text-fg-3">
              <li className="flex items-center gap-1.5">
                <span className="size-2 rounded-[2px] bg-azure-500" /> Выручка
              </li>
              <li className="flex items-center gap-1.5">
                <span className="h-0.5 w-3 rounded-full bg-ice-400" /> Пиковый онлайн
              </li>
            </ul>
          </div>
          <div className="px-2 pt-4 pb-3 sm:px-3">
            <RevenueChart data={data} />
          </div>
          {events.length ? (
            <ul className="grid border-t border-line-soft sm:grid-cols-2">
              {events.map((e, i) => (
                <li key={e.id} className={cn("px-5 py-3", i > 0 && "border-t border-line-soft sm:border-t-0 sm:border-l")}>
                  <p className="font-mono text-[11px] text-fg-4 nums">
                    {formatDateShort(e.start)} – {formatDateShort(e.end)}
                  </p>
                  <p className="mt-0.5 text-[13px] text-fg-2">{e.title}</p>
                  {e.note ? <p className="text-[12px] text-ice-300">{e.note}</p> : null}
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <dl className="grid gap-px overflow-hidden rounded-xl border border-line bg-line lg:col-span-4">
          {metrics.map((m) => (
            <div key={m.label} className="flex flex-col bg-surface px-5 py-4">
              <dt className="label-mono text-fg-4">{m.label}</dt>
              <dd className="mt-2 flex items-baseline gap-2.5">
                <span className="font-mono text-[24px] font-medium tracking-[-0.02em] text-fg nums">{m.value}</span>
                {m.delta !== null ? <Delta value={m.delta} /> : <span className="font-mono text-[11px] text-fg-4">середина</span>}
              </dd>
              <p className="mt-1.5 text-[12.5px] leading-snug text-fg-3">{typo(m.note)}</p>
            </div>
          ))}
        </dl>
      </div>

      {/* safety */}
      <div className="mt-20 grid gap-10 lg:mt-28 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-5">
          <h3 className="text-h3 text-fg">Защита — до оплаты и после неё</h3>
          <p className="mt-3 max-w-md text-[15px] leading-relaxed text-fg-2">
            Чарджбэк на 1&nbsp;790&nbsp;₽ стоит дороже самой покупки: штраф банка, снятая выдача, время на спор. Поэтому проверяем до списания,
            а&nbsp;после&nbsp;— всё делаем сами.
          </p>
          <div className="mt-6">
            <RulesCheck />
          </div>
        </div>

        <ul className="divide-y divide-line-soft border-y border-line-soft lg:col-span-7">
          <SpecRow title="Антифрод до оплаты" desc="Риск от 0 до 100 ещё до списания: устройство, IP и VPN, сколько карт пробовали, история в сети PayMC">
            <ul className="w-full space-y-1.5 sm:w-[260px]">
              {riskRows.map((r) => {
                const tone = riskTone(r.risk);
                return (
                  <li key={r.name} className="grid grid-cols-[minmax(0,1fr)_64px_28px] items-center gap-2 font-mono text-[11px]">
                    <span className="truncate text-fg-2">{r.name}</span>
                    <span className="h-1 overflow-hidden rounded-full bg-white/[0.06]">
                      <span
                        className={cn("block h-full rounded-full", tone === "ok" ? "bg-ok" : tone === "warn" ? "bg-warn" : "bg-bad")}
                        style={{ width: `${Math.max(4, r.risk)}%` }}
                      />
                    </span>
                    <span className={cn("text-right nums", tone === "ok" ? "text-ok" : tone === "warn" ? "text-warn" : "text-bad")}>{r.risk}</span>
                    <span className="col-span-3 -mt-1 text-[11px] text-fg-4">{r.verdict}</span>
                  </li>
                );
              })}
            </ul>
          </SpecRow>
          <SpecRow
            title="Общий чёрный список"
            desc="Карта или аккаунт, отметившиеся чарджбэком в одном проекте PayMC, не пройдут оплату ни в одном другом"
          >
            <p className="flex w-full items-center justify-between gap-3 rounded-md border border-bad/20 bg-bad-soft px-2.5 py-2 font-mono text-[11px] sm:w-[260px]">
              <span className="text-fg-2">карта •• 7731</span>
              <span className="text-bad">3 проекта → стоп</span>
            </p>
          </SpecRow>
          <SpecRow title="Автоснятие при чарджбэке" desc="Банк открыл спор — PayMC сам откатывает выдачу: группу, валюту, предметы. Команды отката лежат рядом с командами выдачи.">
            <div className="w-full rounded-md border border-line-soft bg-[#06080c] px-2.5 py-2 font-mono text-[11px] leading-[1.6] sm:w-[260px]">
              <p className="text-fg-4">{rollback.note}</p>
              <p className="break-words text-fg-2">
                <span className="text-fg-4">$ </span>lp user {rollback.player} parent remove {rollback.group}
              </p>
              <p className="text-ok">снято за 0,6&nbsp;с</p>
            </div>
          </SpecRow>
          <SpecRow title="Родительский контроль" desc="Лимит трат в сутки. Покупки дороже 1 000 ₽ — только после подтверждения родителя по ссылке.">
            <div className="w-full sm:w-[260px]">
              <p className="flex justify-between font-mono text-[11px] text-fg-3 nums">
                <span>сегодня</span>
                <span>
                  <span className="text-fg">640 ₽</span> из 1 500 ₽
                </span>
              </p>
              <span className="mt-1.5 block h-1 overflow-hidden rounded-full bg-white/[0.06]">
                <span className="block h-full w-[43%] rounded-full bg-azure-400" />
              </span>
              <p className="mt-2 inline-flex items-center gap-1.5 rounded-sm bg-warn-soft px-1.5 py-0.5 text-[11px] text-warn ring-1 ring-warn/20 ring-inset">
                <span className="size-1.5 rounded-full bg-warn" /> Arctic, 1 790 ₽ — ждёт родителя
              </p>
            </div>
          </SpecRow>
          <SpecRow title="Пакет доказательств для банка" desc="Трасса выдачи, IP, вход в игру после покупки и наигранные часы — один PDF для ответа на спор">
            <div className="flex w-full flex-wrap gap-1 sm:w-[260px]">
              {["trace.pdf", "logins.csv", "playtime.csv", "receipt.pdf"].map((f) => (
                <span key={f} className="rounded-xs bg-white/[0.05] px-1.5 py-0.5 font-mono text-[11px] text-fg-2 ring-1 ring-line ring-inset">
                  {f}
                </span>
              ))}
              <span className="w-full pt-1 font-mono text-[11px] text-fg-4">собирается за 2&nbsp;с · отправка в&nbsp;банк в&nbsp;1&nbsp;клик</span>
            </div>
          </SpecRow>
        </ul>
      </div>
    </Section>
  );
}

function SpecRow({ title, desc, children }: { title: string; desc: string; children: ReactNode }) {
  return (
    <li className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
      <div className="min-w-0 sm:max-w-[330px]">
        <p className="text-[14px] font-medium text-fg">{title}</p>
        <p className="mt-0.5 text-[13px] leading-snug text-fg-3">{typo(desc)}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </li>
  );
}
