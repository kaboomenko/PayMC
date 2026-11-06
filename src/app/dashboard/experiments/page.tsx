import type { Metadata } from "next";
import { Suspense } from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { QueryButton } from "@/components/dashboard/growth/query-button";
import { ExperimentsBoard, type ExperimentView, type TestKind, type VariantView } from "@/components/dashboard/growth/experiments-board";
import { daysTo95, plannedDays } from "@/components/dashboard/growth/experiment-plan";
import { createRng } from "@/lib/utils";
import { DAY, EXPERIMENTS, FUNNEL, NOW_MS, PRODUCTS, mskDayStart } from "@/lib/mock";

export const metadata: Metadata = { title: "A/B-тесты" };

const LEARNINGS: Record<string, string> = {
  "exp-order":
    "Кейсы сверху подняли конверсию, но выручка на посетителя упала: игроки брали кейс за 59 ₽ вместо привилегии. Оставили привилегии первыми, кейсы — вторым рядом. Следующие тесты витрины ведём по выручке на посетителя, а не по конверсии.",
};

/** Which product card a test runs on — its traffic sizes the test, its sales size the effect. */
const EXP_PRODUCT: Record<string, string> = {
  "exp-frost-price": "p-frost",
  "exp-badge": "p-blizzard",
};
const EXP_KIND: Record<string, TestKind> = {
  "exp-frost-price": "price",
  "exp-order": "order",
  "exp-badge": "badge",
};

const round2 = (v: number) => Math.round(v * 100) / 100;

export default async function ExperimentsPage({ searchParams }: PageProps<"/dashboard/experiments">) {
  await searchParams; // ?new=1 is handled on the client

  const products = PRODUCTS.filter((p) => p.status === "active" && p.kind !== "pool").map((p) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    viewsPerDay: Math.max(1, Math.round(p.views30d / 30)),
  }));
  const storefrontPerDay = Math.round(FUNNEL[0].value / 30);

  const experiments: ExperimentView[] = EXPERIMENTS.map((e) => {
    const variants: VariantView[] = e.variants.map((v) => ({
      ...v,
      conv: v.visitors ? (v.conversions / v.visitors) * 100 : 0,
      rpv: v.visitors ? round2(v.revenue / v.visitors) : 0,
      aov: v.conversions ? Math.round(v.revenue / v.conversions) : 0,
    }));
    const product = PRODUCTS.find((p) => p.id === EXP_PRODUCT[e.id]);
    const card = products.find((p) => p.id === product?.id);
    const view: ExperimentView = {
      ...e,
      variants,
      kind: EXP_KIND[e.id],
      learnings: LEARNINGS[e.id],
      productName: product?.name,
      revenue30: product?.revenue30d,
      // drafts are sized by the card's traffic, storefront tests by the storefront's
      visitorsPerDay: card?.viewsPerDay ?? storefrontPerDay,
    };
    if (e.status === "running" && e.startedAt) {
      const start = new Date(e.startedAt).getTime();
      const days = Math.max(1, Math.round((NOW_MS - start) / DAY));
      const visitors = variants.reduce((a, v) => a + v.visitors, 0);
      const perDay = Math.round(visitors / days);
      view.dayOf = days;
      view.visitorsPerDay = perDay;
      // the same planner as the «Новый эксперимент» dialog, fed with the traffic the test really gets
      view.totalDays = plannedDays(perDay, variants[1]?.traffic ?? 50);
      view.daysTo95 = daysTo95(e.probabilityToBeat ?? 0, visitors, perDay);
      // synthetic, deterministic: cumulative revenue per visitor converging to today's values
      const rng = createRng(905);
      const [a, b] = variants;
      view.chart = Array.from({ length: days }, (_, i) => {
        const amp = 0.24 / Math.sqrt(i + 1);
        const last = i === days - 1;
        return {
          day: mskDayStart(days - 1 - i),
          a: last ? a.rpv : round2(a.rpv * (1 + (rng() - 0.5) * 2 * amp)),
          b: last ? b.rpv : round2(b.rpv * (1 + (rng() - 0.45) * 2 * amp)),
        };
      });
    }
    return view;
  });

  return (
    <>
      <PageHeader
        title="A/B-тесты"
        description="Проверяйте цены и витрину на части игроков. Победителя видно по выручке, а не по ощущениям."
        actions={
          <Suspense>
            <QueryButton param="new" variant="primary" size="sm" hotkey="n">
              <Plus /> Новый эксперимент
            </QueryButton>
          </Suspense>
        }
      />

      <Suspense>
        <ExperimentsBoard experiments={experiments} products={products} storefrontPerDay={storefrontPerDay} />
      </Suspense>
    </>
  );
}
