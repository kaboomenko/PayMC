import type { Metadata } from "next";
import { Suspense } from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { Sparkline } from "@/components/ui/sparkline";
import { KpiStrip, Unit } from "@/components/dashboard/growth/kpi-strip";
import { QueryButton } from "@/components/dashboard/growth/query-button";
import { CampaignBoard, type CampaignView } from "@/components/dashboard/growth/campaign-board";
import type { SegmentKey } from "@/components/dashboard/growth/campaign-templates";
import { formatNumber, formatPercent } from "@/lib/format";
import {
  CAMPAIGNS,
  CAMPAIGN_REVENUE_30D,
  CURRENT_PROJECT_ID,
  DAY,
  NOW_MS,
  PLAYERS,
  PRODUCTS,
  SERVERS,
  getKpis,
  getOrders,
  isPaid,
} from "@/lib/mock";

export const metadata: Metadata = { title: "Кампании в игре" };

const SCHEDULE_NOTES: Record<string, string> = {
  "cmp-season": "Запустится 1 декабря вместе с вайпом Анархии",
};

export default async function CampaignsPage({ searchParams }: PageProps<"/dashboard/campaigns">) {
  // ?new=1 and ?segment= are read by the board itself; awaiting keeps the page request-time
  await searchParams;

  const orders30 = getOrders({ days: 30 }).filter((o) => o.campaignId && isPaid(o));
  const daily = Array.from({ length: 30 }, () => 0);
  const lastPurchase = new Map<string, string>();
  for (const o of orders30) {
    const d = Math.floor((NOW_MS - new Date(o.createdAt).getTime()) / DAY);
    if (d < 30) daily[29 - d] += o.amount;
    if (!lastPurchase.has(o.campaignId!)) lastPurchase.set(o.campaignId!, o.createdAt); // newest first
  }

  const reach = CAMPAIGNS.reduce((a, c) => a + c.stats.reached, 0);
  const withOffer = CAMPAIGNS.filter((c) => c.offer && c.status !== "draft");
  const offerReach = withOffer.reduce((a, c) => a + c.stats.reached, 0);
  const converted = withOffer.reduce((a, c) => a + c.stats.converted, 0);
  const active = CAMPAIGNS.filter((c) => c.status === "active").length;
  const paused = CAMPAIGNS.filter((c) => c.status === "paused").length;
  const drafts = CAMPAIGNS.filter((c) => c.status === "draft").length;
  const revenueShare = (CAMPAIGN_REVENUE_30D / (getKpis(30).revenue || 1)) * 100;

  const segmentCounts: Record<SegmentKey, number> = { all: PLAYERS.length, whale: 0, loyal: 0, new: 0, at_risk: 0, dormant: 0 };
  for (const p of PLAYERS) segmentCounts[p.segment] += 1;

  const campaigns: CampaignView[] = CAMPAIGNS.map((c) => ({
    ...c,
    lastPurchaseAt: lastPurchase.get(c.id),
    scheduleNote: SCHEDULE_NOTES[c.id],
  }));

  const products = PRODUCTS.filter((p) => p.status === "active" && p.kind !== "pool").map((p) => ({ id: p.id, name: p.name, price: p.price }));
  const servers = SERVERS.filter((s) => s.projectId === CURRENT_PROJECT_ID).map((s) => ({ id: s.id, name: s.name }));

  return (
    <>
      <PageHeader
        title="Кампании в игре"
        description="Сообщения в чате, на экране и в Telegram — по поведению игроков"
        actions={
          <Suspense>
            <QueryButton param="new" variant="primary" size="sm" hotkey="n">
              <Plus /> Новая кампания
            </QueryButton>
          </Suspense>
        }
      />

      <KpiStrip
        items={[
          {
            label: "Выручка от кампаний · 30 дн",
            value: (
              <>
                {formatNumber(CAMPAIGN_REVENUE_30D)}
                <Unit>₽</Unit>
              </>
            ),
            sub: `${formatPercent(revenueShare)} всей выручки проекта`,
            accent: <Sparkline data={daily} width={84} height={26} tone="ice" />,
          },
          {
            label: "Охват",
            value: formatNumber(reach),
            sub: "игроков получили сообщение",
          },
          {
            label: "Конверсия в покупку",
            value: formatPercent((converted / (offerReach || 1)) * 100),
            sub: `${formatNumber(converted)} покупок из ${formatNumber(offerReach)} показов`,
          },
          {
            label: "Активных кампаний",
            value: (
              <>
                {active}
                <Unit>из {CAMPAIGNS.length}</Unit>
              </>
            ),
            sub: `${paused} на паузе · ${drafts} черновик`,
          },
        ]}
      />

      <Suspense>
        <CampaignBoard campaigns={campaigns} segmentCounts={segmentCounts} products={products} servers={servers} />
      </Suspense>
    </>
  );
}
