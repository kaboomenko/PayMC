import Link from "next/link";
import { ArrowRight, Calculator, Check, Minus } from "lucide-react";
import { PLAN_FEES, TYPICAL_PLATFORM, feeRateFor } from "@/lib/payments";
import { getKpis } from "@/lib/mock";
import { formatMoney, formatNumber, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Section, SectionHeading } from "@/components/marketing/section";
import { Button } from "@/components/ui/button";

const INCLUDED = [
  ["Эквайринг", "СБП, карты Мир, SberPay, T-Pay, ЮMoney, баланс телефона"],
  ["Выплаты каждый день", "в 12:00 МСК на карту или по СБП, резервный банк"],
  ["Чеки НПД и 54-ФЗ", "«Мой налог» для самозанятых, облачная касса для ИП и ООО"],
  ["Выдача и трассировка", "каждый шаг заказа с ответом консоли сервера"],
  ["Антифрод", "риск до оплаты и общий чёрный список проектов"],
  ["Кампании в игре", "чат, титр, боссбар, Telegram и VK"],
  ["A/B-тесты", "цены и витрина, с расчётом уверенности"],
  ["Команда и сплит", "роли, доли выплат, коды блогеров"],
] as const;

const FREE = ["Абонентская плата", "Подключение и настройка", "Вывод по расписанию"];

const TIERS = [
  { range: "до 500 тыс ₽", rate: PLAN_FEES.start, example: 300_000, note: "старт без порога" },
  { range: "от 500 тыс ₽", rate: PLAN_FEES.pro, example: 1_000_000, note: "включится сам со следующего месяца" },
  { range: "от 3 млн ₽", rate: PLAN_FEES.network, example: 5_000_000, note: "и индивидуальные условия" },
];

const EXAMPLE = 300_000;

/** Typical platform: commission + paid withdrawal, both on turnover — the same formula as the calculator. */
function typical(rate: number) {
  const commission = EXAMPLE * rate;
  const withdraw = EXAMPLE * TYPICAL_PLATFORM.withdrawalFee;
  return { commission, withdraw, total: commission + withdraw, net: EXAMPLE - commission - withdraw };
}

export function PricingSection() {
  const lo = typical(TYPICAL_PLATFORM.commissionMin);
  const hi = typical(TYPICAL_PLATFORM.commissionMax);
  const ours = EXAMPLE * feeRateFor(EXAMPLE);
  const saveMin = lo.total - ours;
  const saveMax = hi.total - ours;
  const arctic = getKpis(30).revenue;
  const range = (a: number, b: number) => (Math.round(a) === Math.round(b) ? formatMoney(a) : `${formatNumber(Math.round(a))}–${formatMoney(b)}`);
  const yearK = (v: number) => formatNumber(Math.round((v * 12) / 1000));

  return (
    <Section id="pricing">
      <SectionHeading eyebrow="Цены" title="Одна ставка." muted="Всё включено" />

      <div className="grid gap-4 lg:grid-cols-12">
        {/* the rate */}
        <div className="relative flex flex-col overflow-hidden rounded-xl border border-line-strong bg-surface p-6 sm:p-8 lg:col-span-5">
          <div className="relative">
            <p className="label-mono text-fg-4">С каждого платежа</p>
            <p className="mt-4 font-display text-[96px] leading-[0.85] font-medium tracking-[-0.05em] text-fg nums sm:text-[120px]">
              {formatNumber(PLAN_FEES.start * 100, 1)}
              <span className="ml-2 text-[0.45em] font-medium tracking-normal text-fg-3">%</span>
            </p>
            <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-fg-2">
              Без абонентской платы и пакетов. Платите, только когда продаёте, — ставка снижается сама с ростом оборота.
            </p>
            <ul className="mt-6 space-y-2">
              {FREE.map((f) => (
                <li key={f} className="flex items-center justify-between gap-3 border-b border-line-soft pb-2 text-[13.5px]">
                  <span className="flex items-center gap-2 text-fg-2">
                    <Minus className="size-3.5 text-fg-4" />
                    {f}
                  </span>
                  <span className="font-mono text-fg nums">0 ₽</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="relative mt-auto flex flex-wrap gap-2.5 pt-8">
            <Button asChild variant="white" size="lg">
              <Link href="/signup">
                Создать магазин <ArrowRight />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="#calculator">
                <Calculator /> Посчитать на калькуляторе
              </Link>
            </Button>
          </div>
        </div>

        {/* what's included */}
        <div className="flex flex-col rounded-xl border border-line bg-surface lg:col-span-7">
          <p className="label-mono border-b border-line px-6 py-4 text-fg-4">Входит в ставку</p>
          <ul className="grid sm:grid-cols-2">
            {INCLUDED.map(([title, text], i) => (
              <li
                key={title}
                className={cn(
                  "flex gap-3 border-line-soft px-6 py-4",
                  i > 0 && "border-t",
                  i === 1 && "sm:border-t-0",
                  i % 2 === 1 && "sm:border-l",
                )}
              >
                <Check className="mt-0.5 size-4 shrink-0 text-fg-3" />
                <div>
                  <p className="text-[14px] font-medium text-fg">{title}</p>
                  <p className="mt-0.5 text-[12.5px] leading-snug text-fg-3">{text}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-auto border-t border-line">
            <p className="label-mono px-6 pt-4 text-fg-4">Отдельно, по себестоимости</p>
            <div className="grid sm:grid-cols-2">
              <div className="px-6 py-3">
                <p className="text-[13px] text-fg">Мгновенный вывод</p>
                <p className="mt-0.5 font-mono text-[12px] text-fg-3">+0,5 % к сумме · по желанию</p>
              </div>
              <div className="px-6 pt-1 pb-4 sm:pt-3 sm:pb-3">
                <p className="text-[13px] text-fg">Баланс телефона</p>
                <p className="mt-0.5 font-mono text-[12px] text-fg-3">комиссия оператора + 2 п.п.</p>
              </div>
            </div>
          </div>
        </div>

        {/* tiers */}
        <div className="min-w-0 rounded-xl border border-line bg-surface lg:col-span-7">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-6 py-4">
            <p className="label-mono text-fg-4">Ставка по обороту в месяц</p>
            <p className="text-[12px] text-fg-3">переключается автоматически</p>
          </div>
          <div>
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-line-soft text-left label-mono tracking-[0.07em] text-fg-4">
                  <th className="h-9 pl-6 font-medium">Оборот</th>
                  <th className="h-9 px-3 font-medium">Ставка</th>
                  <th className="hidden h-9 pr-6 text-right font-medium sm:table-cell">Пример</th>
                </tr>
              </thead>
              <tbody>
                {TIERS.map((t, i) => (
                  <tr key={t.range} className="border-b border-line-soft last:border-0">
                    <td className="h-14 pl-6">
                      <p className="text-fg">{t.range}</p>
                      <p className="text-[11.5px] text-fg-4">{t.note}</p>
                      <p className="mt-0.5 font-mono text-[11px] text-fg-3 nums sm:hidden">
                        {formatMoney(t.example)} → {formatMoney(t.example * t.rate)}
                      </p>
                    </td>
                    <td className="px-3 pr-6 sm:pr-3">
                      <span className={cn("font-mono text-[18px] font-medium nums", i === 0 ? "text-fg" : "text-ice-300")}>
                        {formatPercent(t.rate * 100)}
                      </span>
                    </td>
                    <td className="hidden pr-6 text-right font-mono text-[12px] text-fg-3 nums sm:table-cell">
                      {formatMoney(t.example)} → <span className="text-fg-2">{formatMoney(t.example * t.rate)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-line bg-azure-500/[0.04] px-6 py-4">
            <p className="text-[13px] text-fg-2">
              Демо-проект ArcticMC: <span className="font-mono text-fg nums">{formatMoney(arctic)}</span> за 30 дней
            </p>
            <p className="font-mono text-[13px] text-ice-300 nums">ставка {formatPercent(feeRateFor(arctic) * 100)}</p>
          </div>
        </div>

        {/* comparison */}
        <div className="flex flex-col rounded-xl border border-line bg-surface lg:col-span-5">
          <p className="label-mono border-b border-line px-6 py-4 text-fg-4">Оборот {formatMoney(EXAMPLE)} в месяц</p>
          <dl className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-x-4 gap-y-2.5 px-6 py-5 text-[13px]">
            <span />
            <span className="text-right text-[11.5px] text-fg-3">Типичная площадка</span>
            <span className="text-right text-[11.5px] text-fg">PayMC</span>

            <dt className="text-fg-3">Комиссия</dt>
            <dd className="text-right font-mono text-fg-2 nums">{range(lo.commission, hi.commission)}</dd>
            <dd className="text-right font-mono text-fg nums">{formatMoney(ours)}</dd>

            <dt className="text-fg-3">Вывод денег</dt>
            <dd className="text-right font-mono text-fg-2 nums">{range(hi.withdraw, lo.withdraw)}</dd>
            <dd className="text-right font-mono text-fg nums">0 ₽</dd>

            <dt className="border-t border-line-soft pt-2.5 text-fg">На руки</dt>
            <dd className="border-t border-line-soft pt-2.5 text-right font-mono text-fg-2 nums">{range(hi.net, lo.net)}</dd>
            <dd className="border-t border-line-soft pt-2.5 text-right font-mono font-medium text-ice-300 nums">{formatMoney(EXAMPLE - ours)}</dd>
          </dl>
          <div className="mt-auto border-t border-line px-6 py-4">
            <p className="text-[13.5px] text-fg">
              Остаётся у вас: <span className="font-mono text-ok nums">+{range(saveMin, saveMax)}</span> в месяц
            </p>
            <p className="mt-1 text-[11.5px] leading-snug text-fg-4">
              Типичная площадка — комиссия {formatNumber(TYPICAL_PLATFORM.commissionMin * 100)}–
              {formatPercent(TYPICAL_PLATFORM.commissionMax * 100)} и {formatPercent(TYPICAL_PLATFORM.withdrawalFee * 100)} оборота за
              вывод. За год разница&nbsp;— <span className="whitespace-nowrap">{yearK(saveMin)}–{yearK(saveMax)}&nbsp;тыс&nbsp;₽</span>.
            </p>
          </div>
        </div>
      </div>
    </Section>
  );
}
