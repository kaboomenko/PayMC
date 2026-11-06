import { Section, SectionHeading } from "@/components/marketing/section";
import { SavingsCalculator } from "@/components/marketing/landing-a/savings-calculator";
import { PLAN_FEES, TIER_THRESHOLDS, TYPICAL_WITHDRAWAL_FEE } from "@/lib/payments";
import { formatMoneyCompact, formatPercent, typo } from "@/lib/format";

const pct = (rate: number) => formatPercent(rate * 100);
const money = (v: number) => formatMoneyCompact(v);

export function CalculatorSection() {
  const note = typo(
    `Ставка PayMC — ${pct(PLAN_FEES.start)} при обороте до ${money(TIER_THRESHOLDS.pro)} в месяц, ${pct(PLAN_FEES.pro)} — от ${money(TIER_THRESHOLDS.pro)}, ` +
      `${pct(PLAN_FEES.network)} — от ${money(TIER_THRESHOLDS.network)}; в неё входят эквайринг, ежедневные выплаты, чеки и выдача. ` +
      `Ставка текущей площадки — выбранная комиссия плюс ${pct(TYPICAL_WITHDRAWAL_FEE)} за вывод, если он платный; обе считаются от оборота. ` +
      `Платежи с баланса телефона не учитываем: там своя комиссия оператора.`,
  );
  return (
    <Section id="calculator">
      <SectionHeading
        eyebrow="Калькулятор"
        title="Посчитайте, сколько останется у вас."
        muted="Одна ставка вместо комиссии плюс вывода"
        lead="Подставьте свой оборот и комиссию площадки, на которой вы сейчас. Ставка PayMC подбирается по обороту сама."
      />
      <SavingsCalculator />
      <p className="mt-5 max-w-4xl text-[12.5px] leading-relaxed text-fg-4">
        <span className="font-mono text-fg-3">Останется = оборот × (1 − ставка).</span> {note}
      </p>
    </Section>
  );
}
