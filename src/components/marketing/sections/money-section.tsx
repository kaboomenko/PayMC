import { Section, SectionHeading } from "@/components/marketing/section";
import { MoneyBento, type SplitMember } from "@/components/marketing/landing-a/money-bento";
import { ReceiptCard } from "@/components/marketing/landing-a/receipt-card";
import { TEAM } from "@/lib/mock";
import { memberRoleMeta } from "@/lib/mock/meta";

/** Short payout destination for the split list: "Т-Банк · СБП · +7 9•• •••-12-40" → "Т-Банк · СБП". */
function shortDestination(d?: string) {
  if (!d) return "—";
  const parts = d.split(" · ");
  return parts.length > 2 ? parts.slice(0, 2).join(" · ") : d;
}

export function MoneySection() {
  const members: SplitMember[] = TEAM.filter((m) => m.splitPct > 0).map((m) => ({
    name: m.name,
    role: memberRoleMeta[m.role].label,
    pct: m.splitPct,
    destination: shortDestination(m.payoutDestination),
  }));

  return (
    <Section id="money">
      <SectionHeading
        index="04"
        eyebrow="Деньги"
        title="Деньги не застрянут."
        muted="Выплаты каждый день, даже если банк капризничает."
        lead="Выплата в 12:00 по Москве — на карту или по СБП, в выходные и праздники тоже. Каждая часть ниже работает: нажмите на день, переключите банк, сравните способы оплаты."
      />
      <MoneyBento members={members} receipt={<ReceiptCard />} />
    </Section>
  );
}
