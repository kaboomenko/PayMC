import type { Metadata } from "next";
import { Suspense } from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { QueryButton } from "@/components/dashboard/growth/query-button";
import { CampaignBoard, type CampaignView } from "@/components/dashboard/growth/campaign-board";
import type { SegmentKey } from "@/components/dashboard/growth/campaign-templates";
import { formatDate, formatTime } from "@/lib/format";
import {
  CALENDAR,
  CAMPAIGNS,
  CAMPAIGN_REVENUE_30D,
  CURRENT_PROJECT_ID,
  DAY,
  NOW_MS,
  PLAYERS,
  PRODUCTS,
  PROJECTS,
  SERVERS,
  getKpis,
  getOrders,
  isPaid,
} from "@/lib/mock";

export const metadata: Metadata = { title: "Кампании в игре" };

/**
 * Campaigns started by a calendar event. Both pages read the event's «Автозапуск»:
 * on — the card is «Запланирована», off — it stays a draft to switch on by hand.
 */
const SCHEDULES: Record<string, { eventId: string; with: string }> = {
  "cmp-season": { eventId: "ev-wipe-anarchy", with: "вместе с вайпом Анархии" },
};

export default async function CampaignsPage({ searchParams }: PageProps<"/dashboard/campaigns">) {
  // ?new=1, ?segment= and ?template= are read by the board itself; awaiting keeps the page request-time
  await searchParams;

  const kpis30 = getKpis(30);
  const orders30 = getOrders({ days: 30 }).filter((o) => o.campaignId && isPaid(o));
  const daily = Array.from({ length: 30 }, () => 0);
  const lastPurchase = new Map<string, string>();
  for (const o of orders30) {
    const d = Math.floor((NOW_MS - new Date(o.createdAt).getTime()) / DAY);
    if (d < 30) daily[29 - d] += o.amount;
    if (!lastPurchase.has(o.campaignId!)) lastPurchase.set(o.campaignId!, o.createdAt); // newest first
  }

  // Audiences use the same player base as «Обзор»: everyone active in the last 30 days.
  // The player list holds a sample of them, so its segment mix is scaled up to that base.
  const activeBase = kpis30.conversion ? Math.round(kpis30.buyers / (kpis30.conversion / 100)) : PLAYERS.length;
  const scale = activeBase / (PLAYERS.length || 1);
  const sampleCounts: Record<SegmentKey, number> = { all: 0, whale: 0, loyal: 0, new: 0, at_risk: 0, dormant: 0 };
  for (const p of PLAYERS) sampleCounts[p.segment] += 1;
  const segmentCounts: Record<SegmentKey, number> = {
    all: activeBase,
    whale: Math.round(sampleCounts.whale * scale),
    loyal: Math.round(sampleCounts.loyal * scale),
    new: Math.round(sampleCounts.new * scale),
    at_risk: Math.round(sampleCounts.at_risk * scale),
    dormant: Math.round(sampleCounts.dormant * scale),
  };

  const campaigns: CampaignView[] = CAMPAIGNS.map((c) => {
    const schedule = SCHEDULES[c.id];
    const event = schedule ? CALENDAR.find((e) => e.id === schedule.eventId) : undefined;
    const view: CampaignView = { ...c, lastPurchaseAt: lastPurchase.get(c.id) };
    if (event && schedule && c.status === "draft") {
      view.status = event.autoStart ? "scheduled" : "draft";
      view.scheduleNote = `Запустится ${formatDate(event.start, { year: false })} в ${formatTime(event.start)} ${schedule.with}`;
    }
    return view;
  });

  const products = PRODUCTS.filter((p) => p.status === "active" && p.kind !== "pool").map((p) => ({ id: p.id, name: p.name, price: p.price }));
  const servers = SERVERS.filter((s) => s.projectId === CURRENT_PROJECT_ID).map((s) => ({ id: s.id, name: s.name }));
  const goal = PROJECTS.find((p) => p.id === CURRENT_PROJECT_ID)?.goal ?? null;

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

      <Suspense>
        <CampaignBoard
          campaigns={campaigns}
          segmentCounts={segmentCounts}
          products={products}
          servers={servers}
          kpi={{ revenue30: CAMPAIGN_REVENUE_30D, revenueShare: (CAMPAIGN_REVENUE_30D / (kpis30.revenue || 1)) * 100, daily }}
          goal={goal ? { title: goal.title, raised: goal.raised, target: goal.target } : null}
        />
      </Suspense>
    </>
  );
}
