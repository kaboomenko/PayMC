import { Section, SectionHeading } from "@/components/marketing/section";
import { MoneyBento, type SplitMember } from "@/components/marketing/landing-a/money-bento";
import { buildPayoutWeek } from "@/components/marketing/landing-a/money-data";
import { ReceiptCard } from "@/components/marketing/landing-a/receipt-card";
import { PAYOUTS, TAX, TEAM, getProduct } from "@/lib/mock";
import { memberRoleMeta } from "@/lib/mock/meta";
import { pluralize } from "@/lib/format";

/** Short payout destination for the split list: "Т-Банк · СБП · +7 9•• •••-12-40" → "Т-Банк · СБП". */
function shortDestination(d?: string) {
  if (!d) return "—";
  const parts = d.split(" · ");
  return parts.length > 2 ? parts.slice(0, 2).join(" · ") : d;
}

export function MoneySection() {
  const team = TEAM.filter((m) => m.splitPct > 0);
  const members: SplitMember[] = team.map((m) => ({
    name: m.name,
    role: memberRoleMeta[m.role].label,
    pct: m.splitPct,
    destination: shortDestination(m.payoutDestination),
  }));

  const sbp = team.filter((m) => m.payoutDestination?.includes("СБП")).length;
  const channels = sbp === team.length ? "СБП" : sbp === 0 ? "карта" : "СБП и карта";
  const week = buildPayoutWeek(
    PAYOUTS,
    team.map((m) => m.id),
    channels,
  );

  const frost = getProduct("p-frost");
  const receiptItem = frost
    ? { name: `Привилегия ${frost.name}${frost.durationDays ? `, ${pluralize(frost.durationDays, ["день", "дня", "дней"])}` : ""}`, price: frost.price }
    : { name: "Привилегия Frost, 30 дней", price: 299 };

  return (
    <Section id="money">
      <SectionHeading
        index="04"
        eyebrow="Деньги"
        title="Деньги не застрянут."
        muted="Выплаты каждый день, даже если банк капризничает"
        lead="Выплата в 12:00 по Москве — на карту или по СБП, в выходные и праздники тоже. Каждая часть ниже работает: нажмите на день, переключите банк, сравните способы оплаты."
      />
      <MoneyBento members={members} week={week} receipt={<ReceiptCard income={TAX.yearIncome} limit={TAX.limit} item={receiptItem} />} />
    </Section>
  );
}
