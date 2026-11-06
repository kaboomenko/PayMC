import { Section, SectionHeading } from "@/components/marketing/section";
import { SavingsCalculator } from "@/components/marketing/landing-a/savings-calculator";

export function CalculatorSection() {
  return (
    <Section id="calculator">
      <SectionHeading
        eyebrow="Калькулятор"
        title="Посчитайте, сколько останется у вас."
        muted="Одна ставка вместо комиссии плюс вывода."
        lead="Подставьте свой оборот и комиссию площадки, на которой вы сейчас. Ставка PayMC подбирается по обороту сама."
      />
      <SavingsCalculator />
      <p className="mt-5 max-w-4xl text-[12.5px] leading-relaxed text-fg-4">
        <span className="font-mono text-fg-3">Останется = оборот × (1 − ставка).</span> Ставка PayMC — 4,9&nbsp;% при обороте до
        500&nbsp;тыс&nbsp;₽ в&nbsp;месяц, 3,9&nbsp;% — от 500&nbsp;тыс&nbsp;₽, 2,9&nbsp;% — от 3&nbsp;млн&nbsp;₽; в&nbsp;неё входят
        эквайринг, ежедневные выплаты, чеки и&nbsp;выдача. Ставка текущей площадки — выбранная комиссия плюс 1,5&nbsp;%, если вывод
        оплачивается отдельно. Платежи с&nbsp;баланса телефона не&nbsp;учитываем: там своя комиссия оператора.
      </p>
    </Section>
  );
}
