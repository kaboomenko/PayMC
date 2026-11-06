"use client";

import * as React from "react";
import { Slider as S } from "radix-ui";
import { ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCompact, formatMoney, formatMoneyCompact, formatPercent, typo } from "@/lib/format";
import { PLAN_FEES, TIER_THRESHOLDS, TYPICAL_WITHDRAWAL_FEE, feeRateFor } from "@/lib/payments";
import { Segmented } from "@/components/ui/segmented";
import { Switch } from "@/components/ui/switch";
import { CountUp } from "./count-up";

/** Log-ish turnover steps: fine-grained at the low end, coarse at the top. */
const STEPS = [
  10_000, 15_000, 20_000, 25_000, 30_000, 40_000, 50_000, 60_000, 75_000, 100_000, 125_000, 150_000, 200_000, 250_000, 300_000,
  400_000, 500_000, 600_000, 750_000, 1_000_000, 1_250_000, 1_500_000, 2_000_000, 2_500_000, 3_000_000,
];
const TICKS = [10_000, 100_000, 500_000, 1_000_000, 3_000_000];
const DEFAULT_STEP = STEPS.indexOf(150_000);

const CURRENT_RATES = ["5", "7", "9", "12"] as const;
type CurrentRate = (typeof CURRENT_RATES)[number];
/** Paid withdrawals on a typical platform — the same constant the pricing comparison uses; charged on turnover. */
const WITHDRAWAL_FEE = TYPICAL_WITHDRAWAL_FEE;

const TIERS = [
  { rate: PLAN_FEES.start, label: "до 500 тыс", from: 0 },
  { rate: PLAN_FEES.pro, label: "от 500 тыс", from: TIER_THRESHOLDS.pro },
  { rate: PLAN_FEES.network, label: "от 3 млн", from: TIER_THRESHOLDS.network },
];

const pctLabel = (rate: number) => formatPercent(rate * 100, { digits: 1 });

const INCLUDED = ["эквайринг", "ежедневные выплаты", "резервный банк", "чеки НПД и 54-ФЗ", "выдача и повторы", "антифрод"];

export function SavingsCalculator() {
  const [step, setStep] = React.useState(DEFAULT_STEP);
  const [current, setCurrent] = React.useState<CurrentRate>("9");
  const [withdrawal, setWithdrawal] = React.useState(true);

  const turnover = STEPS[step];
  const paymcRate = feeRateFor(turnover);
  const currentRate = Number(current) / 100 + (withdrawal ? WITHDRAWAL_FEE : 0);

  const paymcFee = turnover * paymcRate;
  const currentFee = turnover * currentRate;
  const paymcNet = turnover - paymcFee;
  const currentNet = turnover - currentFee;
  const monthly = paymcNet - currentNet;
  const yearly = monthly * 12;

  const tierIdx = TIERS.findLastIndex((t) => turnover >= t.from);
  const next = TIERS[tierIdx + 1];
  const toNext = next ? next.from - turnover : 0;
  const nextClose = next && toNext <= next.from * 0.4;

  const maxFee = Math.max(paymcFee, currentFee);

  return (
    <div className="overflow-hidden rounded-xl border border-line-strong bg-surface shadow-[0_40px_120px_-50px_rgb(0_0_0/0.95)]">
      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)]">
        {/* inputs */}
        <div className="space-y-8 border-b border-line p-5 sm:p-7 lg:border-r lg:border-b-0">
          <div>
            <div className="flex items-baseline justify-between gap-3">
              <p id="calc-turnover-label" className="text-[13px] text-fg-2">
                Оборот магазина в месяц
              </p>
              <p className="font-mono text-[22px] font-medium tracking-[-0.02em] text-fg nums">{formatMoney(turnover)}</p>
            </div>
            <S.Root
              value={[step]}
              min={0}
              max={STEPS.length - 1}
              step={1}
              onValueChange={([v]) => setStep(v)}
              className="relative mt-4 flex h-5 w-full touch-none items-center select-none"
            >
              <S.Track className="relative h-1 grow overflow-hidden rounded-full bg-white/[0.08]">
                <S.Range className="absolute h-full rounded-full bg-gradient-to-r from-azure-500 to-ice-400" />
              </S.Track>
              <S.Thumb
                aria-labelledby="calc-turnover-label"
                aria-valuetext={formatMoney(turnover)}
                className="block size-[18px] rounded-full border-2 border-white bg-azure-500 shadow-[0_0_0_4px_rgb(51_119_255/0.2),0_2px_6px_rgb(0_0_0/0.5)] transition-shadow outline-none hover:shadow-[0_0_0_6px_rgb(51_119_255/0.25)] focus-visible:shadow-[0_0_0_6px_rgb(51_119_255/0.4)]"
              />
            </S.Root>
            <div className="relative mt-2 h-4 font-mono text-[10.5px] text-fg-4" aria-hidden>
              {TICKS.map((t, i) => {
                const left = (STEPS.indexOf(t) / (STEPS.length - 1)) * 100;
                return (
                  <span
                    key={t}
                    className={cn(
                      "absolute whitespace-nowrap",
                      i === 0 ? "left-0" : i === TICKS.length - 1 ? "right-0" : "-translate-x-1/2",
                      t === 1_000_000 && "hidden sm:block",
                    )}
                    style={i === 0 || i === TICKS.length - 1 ? undefined : { left: `${left}%` }}
                  >
                    {formatCompact(t)}
                  </span>
                );
              })}
            </div>
          </div>

          <fieldset>
            <legend className="text-[13px] text-fg-2">Сколько берёт текущая площадка</legend>
            <Segmented
              value={current}
              onChange={setCurrent}
              options={CURRENT_RATES.map((r) => ({ value: r, label: `${r} %` }))}
              className="mt-3"
            />
          </fieldset>

          <label className="flex cursor-pointer items-start justify-between gap-4 select-none">
            <span>
              <span className="block text-[13px] text-fg-2">Плачу отдельно за вывод</span>
              <span className="mt-0.5 block text-[12px] text-fg-4">+{pctLabel(WITHDRAWAL_FEE)} от оборота к комиссии площадки</span>
            </span>
            <Switch checked={withdrawal} onCheckedChange={setWithdrawal} aria-label="Плачу отдельно за вывод" className="mt-0.5" />
          </label>

          {/* tier track */}
          <div>
            <p className="label-mono text-[10px] text-fg-4">Ставка PayMC по обороту</p>
            <div className="mt-2.5 grid grid-cols-3 gap-1">
              {TIERS.map((t, i) => (
                <div
                  key={t.label}
                  className={cn(
                    "rounded-md border px-2.5 py-2 transition-colors duration-200",
                    i === tierIdx ? "border-azure-400/50 bg-azure-500/10" : "border-line-soft",
                  )}
                >
                  <p className={cn("font-mono text-[14px] nums", i === tierIdx ? "text-fg" : "text-fg-3")}>{pctLabel(t.rate)}</p>
                  <p className="text-[11px] text-fg-4">{t.label}</p>
                </div>
              ))}
            </div>
            <p className={cn("mt-2.5 text-[12px] leading-snug", nextClose ? "text-ice-300" : "text-fg-4")} aria-live="polite">
              {typo(
                next
                  ? nextClose
                    ? `До ставки ${pctLabel(next.rate)} — ещё ${formatMoneyCompact(toNext)} оборота в месяц. Снизится автоматически.`
                    : `Ставка снижается автоматически, без заявок и абонентки.`
                  : `Максимальная скидка. Для сетей от ${formatMoneyCompact(TIER_THRESHOLDS.network)} — индивидуальные условия.`,
              )}
            </p>
          </div>
        </div>

        {/* outputs */}
        <div className="flex flex-col p-5 sm:p-7">
          <p className="label-mono text-[10px] text-fg-4">Останется у вас в месяц</p>

          <div className="mt-4 space-y-4">
            <ResultRow
              name="PayMC"
              rate={pctLabel(paymcRate)}
              net={paymcNet}
              fee={paymcFee}
              barPct={maxFee ? (paymcFee / maxFee) * 100 : 0}
              highlight
            />
            <ResultRow
              name="Текущая площадка"
              rate={withdrawal ? `${current} % + ${pctLabel(WITHDRAWAL_FEE)} за вывод` : `${current} %`}
              net={currentNet}
              fee={currentFee}
              barPct={maxFee ? (currentFee / maxFee) * 100 : 0}
            />
          </div>

          <div className="mt-7 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line">
            <div className="bg-surface-2 p-4">
              <p className="text-[12px] text-fg-3">Разница в месяц</p>
              <CountUp value={monthly} format="signedMoney" className="mt-1 block font-mono text-[22px] font-medium tracking-[-0.02em] text-fg nums" />
            </div>
            <div className="bg-surface-2 p-4">
              <p className="text-[12px] text-fg-3">Разница за год</p>
              <CountUp
                value={yearly}
                format="signedMoney"
                className="mt-1 block font-mono text-[22px] font-medium tracking-[-0.02em] text-ice-300 nums sm:text-[26px]"
              />
            </div>
          </div>

          <div className="mt-auto pt-7">
            <p className="label-mono text-[10px] text-fg-4">В ставку PayMC уже входит</p>
            <ul className="mt-2.5 flex flex-wrap gap-1.5">
              {INCLUDED.map((x) => (
                <li key={x} className="inline-flex h-6 items-center rounded-sm border border-line-soft px-2 font-mono text-[11px] text-fg-3">
                  {x}
                </li>
              ))}
            </ul>
            <p className="mt-4 flex items-start gap-2 text-[12px] leading-relaxed text-fg-4">
              <ArrowDownRight className="mt-0.5 size-3.5 shrink-0" />
              Без абонентской платы: если в месяце нет продаж, вы не платите ничего.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ResultRow({
  name,
  rate,
  net,
  fee,
  barPct,
  highlight,
}: {
  name: string;
  rate: string;
  net: number;
  fee: number;
  barPct: number;
  highlight?: boolean;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="min-w-0 text-[13px]">
          <span className={highlight ? "font-medium text-fg" : "text-fg-2"}>{name}</span>
          <span className="mt-0.5 block font-mono text-[11.5px] text-fg-4">{rate}</span>
        </p>
        <CountUp
          value={net}
          className={cn("font-mono font-medium tracking-[-0.02em] nums", highlight ? "text-[26px] text-fg sm:text-[30px]" : "text-[20px] text-fg-2 sm:text-[22px]")}
        />
      </div>
      <div className="mt-2 flex items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.05]">
          <div
            className={cn("h-full rounded-full transition-[width] duration-300 ease-[var(--ease-snappy)]", highlight ? "bg-azure-400" : "bg-fg-4")}
            style={{ width: `${barPct}%` }}
          />
        </div>
        <p className="w-[132px] shrink-0 text-right font-mono text-[11px] text-fg-4 nums">
          комиссия <CountUp value={fee} className="text-fg-3" />
        </p>
      </div>
    </div>
  );
}
