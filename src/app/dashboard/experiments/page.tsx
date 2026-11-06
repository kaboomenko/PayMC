import type { Metadata } from "next";
import { Suspense } from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { KpiStrip, Unit } from "@/components/dashboard/growth/kpi-strip";
import { QueryButton } from "@/components/dashboard/growth/query-button";
import { ExperimentsBoard, type ExperimentView, type VariantView } from "@/components/dashboard/growth/experiments-board";
import { createRng } from "@/lib/utils";
import { formatNumber, formatPercent } from "@/lib/format";
import { DAY, EXPERIMENTS, FUNNEL, NOW_MS, PRODUCTS, mskDayStart } from "@/lib/mock";

export const metadata: Metadata = { title: "A/B-тесты" };

const LEARNINGS: Record<string, string> = {
  "exp-order":
    "Кейсы сверху подняли конверсию, но выручка на посетителя упала: игроки брали кейс за 59 ₽ вместо привилегии. Оставили привилегии первыми, кейсы — вторым рядом. Следующие тесты витрины ведём по выручке на посетителя, а не по конверсии.",
};

const round2 = (v: number) => Math.round(v * 100) / 100;

export default async function ExperimentsPage({ searchParams }: PageProps<"/dashboard/experiments">) {
  await searchParams; // ?new=1 is handled on the client

  const experiments: ExperimentView[] = EXPERIMENTS.map((e) => {
    const variants: VariantView[] = e.variants.map((v) => ({
      ...v,
      conv: v.visitors ? (v.conversions / v.visitors) * 100 : 0,
      rpv: v.visitors ? round2(v.revenue / v.visitors) : 0,
      aov: v.conversions ? Math.round(v.revenue / v.conversions) : 0,
    }));
    const view: ExperimentView = { ...e, variants, learnings: LEARNINGS[e.id] };
    if (e.status === "running" && e.startedAt && e.endsAt) {
      const start = new Date(e.startedAt).getTime();
      const days = Math.max(1, Math.round((NOW_MS - start) / DAY));
      view.dayOf = days;
      view.totalDays = Math.round((new Date(e.endsAt).getTime() - start) / DAY);
      view.daysTo95 = 4;
      view.visitorsPerDay = Math.round(variants.reduce((a, v) => a + v.visitors, 0) / days);
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

  const running = experiments.find((e) => e.status === "running");
  const lift = running ? ((running.variants[1].rpv - running.variants[0].rpv) / running.variants[0].rpv) * 100 : 0;
  const frost = PRODUCTS.find((p) => p.id === "p-frost")!;
  const monthly = Math.round(frost.revenue30d * (lift / 100));
  const tested = experiments.filter((e) => e.status !== "draft").reduce((a, e) => a + e.variants.reduce((s, v) => s + v.visitors, 0), 0);

  const products = PRODUCTS.filter((p) => p.status === "active" && p.kind !== "pool").map((p) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    viewsPerDay: Math.max(1, Math.round(p.views30d / 30)),
  }));
  const storefrontPerDay = Math.round(FUNNEL[0].value / 30);

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

      <KpiStrip
        items={[
          { label: "Идёт сейчас", value: experiments.filter((e) => e.status === "running").length, sub: running ? `${running.name.split(":")[0]} · день ${running.dayOf} из ${running.totalDays}` : "—" },
          { label: "Лучший вариант", value: formatPercent(lift, { signed: true }), sub: "₽ на посетителя у B против A" },
          {
            label: "Если применить B",
            value: (
              <>
                +{formatNumber(monthly)}
                <Unit>₽/мес</Unit>
              </>
            ),
            sub: "по продажам Frost за 30 дней",
          },
          { label: "Игроков в тестах", value: formatNumber(tested), sub: `${experiments.filter((e) => e.status === "completed").length} завершён · ${experiments.filter((e) => e.status === "draft").length} черновик` },
        ]}
      />

      <Suspense>
        <ExperimentsBoard experiments={experiments} products={products} storefrontPerDay={storefrontPerDay} />
      </Suspense>
    </>
  );
}
