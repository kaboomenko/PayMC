import { Hero } from "@/components/marketing/hero/hero";
import { PaymentsStrip } from "@/components/marketing/sections/payments-strip";
import { DiffSection } from "@/components/marketing/sections/diff-section";
import { DeliverySection } from "@/components/marketing/sections/delivery-section";
import { GrowthSection } from "@/components/marketing/sections/growth-section";
import { AnalyticsSafetySection } from "@/components/marketing/sections/analytics-safety-section";
import { MoneySection } from "@/components/marketing/sections/money-section";
import { CalculatorSection } from "@/components/marketing/sections/calculator-section";
import { MigrateSection } from "@/components/marketing/sections/migrate-section";
import { GamesSection } from "@/components/marketing/sections/games-section";
import { SetupSection } from "@/components/marketing/sections/setup-section";
import { PricingSection } from "@/components/marketing/sections/pricing-section";
import { ChangelogStrip } from "@/components/marketing/sections/changelog-strip";
import { FaqSection } from "@/components/marketing/sections/faq-section";
import { FinalCta } from "@/components/marketing/sections/final-cta";

/**
 * Landing narrative:
 * 1. Hero — try a purchase and watch it reach the game.
 * 2. Where money leaks (diff) → delivery you can verify → growth inside the game
 *    → analytics & safety → money that doesn't get stuck → calculator → migration.
 * 3. Proof & details: games table, setup, pricing, changelog, FAQ, final CTA.
 */
export default function LandingPage() {
  return (
    <>
      <Hero />
      <PaymentsStrip />
      <DiffSection />
      <DeliverySection />
      <GrowthSection />
      <AnalyticsSafetySection />
      <MoneySection />
      <CalculatorSection />
      <MigrateSection />
      <GamesSection />
      <SetupSection />
      <PricingSection />
      <ChangelogStrip />
      <FaqSection />
      <FinalCta />
    </>
  );
}
