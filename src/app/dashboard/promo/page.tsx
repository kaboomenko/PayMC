import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Layers, Plus } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { QueryButton } from "@/components/dashboard/growth/query-button";
import { PromoManager, type PromoRow } from "@/components/dashboard/growth/promo-manager";
import { CALENDAR, NOW_MS, PRODUCTS, PROMO_CODES, getKpis } from "@/lib/mock";

export const metadata: Metadata = { title: "Промокоды" };

export default async function PromoPage({ searchParams }: PageProps<"/dashboard/promo">) {
  await searchParams; // ?new=1 / ?batch=1 are handled by the client manager

  const revenue = PROMO_CODES.reduce((a, p) => a + p.revenue, 0);
  const uses = PROMO_CODES.reduce((a, p) => a + p.uses, 0);
  const percentUses = PROMO_CODES.filter((p) => p.kind === "percent");
  const avgDiscount = percentUses.reduce((a, p) => a + p.value * p.uses, 0) / (percentUses.reduce((a, p) => a + p.uses, 0) || 1);
  const share = (revenue / (getKpis(90).revenue || 1)) * 100;
  const top = [...PROMO_CODES].sort((a, b) => b.revenue - a.revenue)[0];
  // paused codes a calendar event switches on («Промокод BLACKFRIDAY включится сам»)
  const scheduled = PROMO_CODES.filter((p) => p.status === "paused").flatMap((p) => {
    const ev = CALENDAR.find((e) => e.note?.includes(p.code) && new Date(e.start).getTime() > NOW_MS);
    return ev ? [{ code: p.code, at: ev.start }] : [];
  });

  const rows: PromoRow[] = PROMO_CODES.map((p) => ({ ...p }));
  const products = PRODUCTS.filter((p) => p.status === "active" && p.kind !== "pool").map((p) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    category: p.category,
  }));

  return (
    <>
      <PageHeader
        title="Промокоды"
        description="Скидки для стримов, розыгрышей и новичков. Лимиты и сроки срабатывают сами."
        actions={
          <Suspense>
            <QueryButton param="batch" variant="secondary" size="sm">
              <Layers /> Пачка одноразовых
            </QueryButton>
            <QueryButton param="new" variant="primary" size="sm" hotkey="n">
              <Plus /> Новый промокод
            </QueryButton>
          </Suspense>
        }
      />

      <Suspense>
        <PromoManager
          codes={rows}
          products={products}
          kpi={{ revenue, share, uses, topCode: top.code, topUses: top.uses, avgDiscount, scheduled }}
        />
      </Suspense>

      <div className="mt-4 grid gap-3 text-[12.5px] text-fg-3 sm:grid-cols-3">
        <p className="rounded-lg border border-line-soft px-4 py-3">
          <span className="text-fg-2">Коды не суммируются.</span> В заказе действует один промокод или код блогера — выгоднейший для
          игрока.
        </p>
        <p className="rounded-lg border border-line-soft px-4 py-3">
          <span className="text-fg-2">Истёкшие и исчерпанные коды</span> выключаются сами, игрок видит понятную причину, а не «ошибка».
        </p>
        <p className="rounded-lg border border-line-soft px-4 py-3">
          <span className="text-fg-2">Акции по датам</span> удобнее вести в{" "}
          <Link href="/dashboard/calendar" className="text-azure-300 underline-offset-2 hover:underline">
            календаре
          </Link>{" "}
          — там же включается BLACKFRIDAY.
        </p>
      </div>
    </>
  );
}
