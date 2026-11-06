import type { Metadata } from "next";
import { Suspense } from "react";
import { UserPlus } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Sparkline } from "@/components/ui/sparkline";
import { KpiStrip, Unit } from "@/components/dashboard/growth/kpi-strip";
import { QueryButton } from "@/components/dashboard/growth/query-button";
import { CreatorsBoard, type CreatorRow } from "@/components/dashboard/growth/creators-board";
import { createRng } from "@/lib/utils";
import { formatNumber, formatPercent } from "@/lib/format";
import { CREATORS, DAY, HOUR, NOW_MS, getOrders, isPaid, mskDayStart } from "@/lib/mock";

export const metadata: Metadata = { title: "Партнёры" };

export default async function CreatorsPage({ searchParams }: PageProps<"/dashboard/creators">) {
  await searchParams; // ?creator=<id> and ?invite=1 are read on the client

  const last30 = getOrders({ days: 30 }).filter((o) => o.creatorCode && isPaid(o));
  const buyers30 = new Set(last30.map((o) => o.playerId)).size;

  const rows: CreatorRow[] = CREATORS.map((c) => {
    const mine30 = last30.filter((o) => o.creatorCode === c.code);
    // getOrders' text query also matches product names (FROST → «Frost»), so keep exact code matches only
    const recentOrders = getOrders({ query: c.code })
      .filter((o) => o.creatorCode === c.code)
      .slice(0, 8)
      .map((o) => ({
        id: o.id,
        playerName: o.playerName,
        items: o.items.map((it) => (it.qty > 1 ? `${it.name} ×${it.qty}` : it.name)).join(", "),
        amount: o.amount,
        createdAt: o.createdAt,
      }));
    const revenue14 = mine30.filter((o) => NOW_MS - new Date(o.createdAt).getTime() < 14 * DAY).reduce((a, o) => a + o.amount, 0);

    // payout history: every 14 days since joining, amounts split deterministically
    const daysIn = Math.floor((NOW_MS - new Date(c.joinedAt).getTime()) / DAY);
    const n = c.paidOut > 0 ? Math.max(1, Math.min(5, Math.floor(daysIn / 14) - 1)) : 0;
    const rng = createRng(c.code.length * 977 + c.followers);
    const weights = Array.from({ length: n }, () => 0.6 + rng());
    const wSum = weights.reduce((a, b) => a + b, 0) || 1;
    let left = c.paidOut;
    const payouts = weights.map((w, i) => {
      const amount = i === n - 1 ? left : Math.round((c.paidOut * w) / wSum);
      left -= amount;
      return {
        id: `cp-${c.id}-${i}`,
        amount,
        at: new Date(mskDayStart(6 + i * 14) + 12 * HOUR).toISOString(),
        receipt: `НПД ${c.code.slice(0, 3)}-${String(4200 + Math.round(rng() * 5000))}`,
      };
    });

    return {
      ...c,
      revenue30: c.trend.reduce((a, v) => a + v, 0),
      buyers30: new Set(mine30.map((o) => o.playerId)).size,
      revenue14,
      recentOrders,
      payouts,
      cabinetUrl: `https://paymc.ru/partner/arctic/${c.code.toLowerCase()}`,
    };
  }).sort((a, b) => (a.status === "invited" ? 1 : 0) - (b.status === "invited" ? 1 : 0) || b.revenue30 - a.revenue30);

  const revenue30 = rows.reduce((a, r) => a + r.revenue30, 0);
  const owed = rows.reduce((a, r) => a + r.owed, 0);
  const avgShare = rows.reduce((a, r) => a + r.sharePct * r.revenue30, 0) / (revenue30 || 1);
  const daily = Array.from({ length: 30 }, (_, i) => rows.reduce((a, r) => a + r.trend[i], 0));
  const owedTo = rows.filter((r) => r.owed > 0).length;
  const shares = rows.filter((r) => r.status === "active").map((r) => r.sharePct);

  return (
    <>
      <PageHeader
        title="Партнёры"
        description="Коды блогеров: доля начисляется сама, выплата — в один клик с чеком, у блогера свой кабинет со статистикой."
        actions={
          <Suspense>
            <QueryButton param="invite" variant="primary" size="sm">
              <UserPlus /> Пригласить блогера
            </QueryButton>
          </Suspense>
        }
      />

      <KpiStrip
        items={[
          {
            label: "Выручка через блогеров · 30 дн",
            value: (
              <>
                {formatNumber(revenue30)}
                <Unit>₽</Unit>
              </>
            ),
            sub: `${rows.filter((r) => r.revenue30 > 0).length} блогеров приносят продажи`,
            accent: <Sparkline data={daily} width={84} height={26} tone="azure" />,
          },
          { label: "Покупателей пришло", value: formatNumber(buyers30), sub: `${formatNumber(last30.length)} заказов с кодами за 30 дней` },
          {
            label: "К выплате блогерам",
            value: (
              <>
                {formatNumber(owed)}
                <Unit>₽</Unit>
              </>
            ),
            sub: `${owedTo} блогерам · автовыплата раз в 14 дней`,
          },
          {
            label: "Средняя доля",
            value: formatPercent(avgShare),
            sub: `от ${Math.min(...shares)} до ${Math.max(...shares)} % · взвешено по выручке`,
          },
        ]}
      />

      <Suspense>
        <CreatorsBoard creators={rows} />
      </Suspense>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {[
          { k: "01", t: "Игрок вводит код", d: "На витрине или командой /donate FROST — получает −5 % на покупку." },
          { k: "02", t: "Доля начисляется сама", d: "С каждой оплаты по коду; возвраты и чарджбэки вычитаются автоматически." },
          { k: "03", t: "Выплата с чеком", d: "Раз в 14 дней от 500 ₽ или вручную. Блогеру-самозанятому чек оформляется сам." },
        ].map((s) => (
          <div key={s.k} className="rounded-lg border border-line-soft px-4 py-3">
            <p className="font-mono text-[11px] text-fg-4">{s.k}</p>
            <p className="mt-1 text-[13px] font-medium text-fg">{s.t}</p>
            <p className="mt-0.5 text-[12.5px] text-fg-3">{s.d}</p>
          </div>
        ))}
      </div>
    </>
  );
}
