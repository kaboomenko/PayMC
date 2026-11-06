import type { Metadata } from "next";
import { PLAN_FEES, PLAN_META, TIER_THRESHOLDS } from "@/lib/payments";
import {
  BALANCE,
  DAILY,
  DAY,
  HOUR,
  HOURLY_HEATMAP,
  NOW_MS,
  PAYOUTS,
  TAX,
  TEAM,
  getOrders,
  isPaid,
  mskDayStart,
} from "@/lib/mock";
import { FinanceView } from "@/components/dashboard/finance/finance-view";
import { FINANCE_TABS, type FinanceData, type FinanceTab, type PayoutRow, type ReceiptRow } from "@/components/dashboard/finance/types";
import type { Order, OrderStatus } from "@/lib/mock/types";

export const metadata: Metadata = { title: "Финансы" };

const NET_FACTOR = 1 - PLAN_FEES.pro; // 3,9 % — tier «Рост»
const RECEIPT_REGISTER_MS = 60_000;
// delivery problems worth a link from the receipts list (an offline player or a command in flight is not one)
const WAITING_DELIVERY: OrderStatus[] = ["retrying", "failed"];

/**
 * Receipt number in the mock's format for receipts that registered after the order snapshot. The mock numbers
 * receipts from 100001 + draft index; offsetting by 200 000 keeps these out of that range, so they never collide.
 */
function receiptNumberFor(orderId: string) {
  const seq = 200_000 + (Number(orderId.replace(/\D/g, "")) || 0);
  return `20${(seq * 7919 + 104729).toString(36).slice(-5)}`;
}
const OWNER_SHARE = (TEAM.find((m) => m.role === "owner")?.splitPct ?? 100) / 100;

function sumRevenue(from: number, to: number) {
  return DAILY.filter((d) => {
    const t = new Date(d.date).getTime();
    return t >= from && t < to;
  }).reduce((a, d) => a + d.revenue, 0);
}

function buildFinanceData(): FinanceData {
  // average of the last 28 full days — the honest base for every forecast on the page
  const full = DAILY.slice(-29, -1);
  const avgDaily = full.reduce((a, d) => a + d.revenue, 0) / full.length;

  // share of daily revenue that usually lands after 12:00 MSK (evening-heavy)
  let afterNoon = 0;
  let total = 0;
  for (const row of HOURLY_HEATMAP) {
    row.forEach((v, h) => {
      total += v;
      if (h >= 12) afterNoon += v;
    });
  }
  const afterNoonShare = total ? afterNoon / total : 0.75;

  const todayOrders = getOrders({ days: 1 }).filter((o) => isPaid(o) && new Date(o.createdAt).getTime() >= mskDayStart(0));
  const earnedToday = Math.round(BALANCE.todayGross * NET_FACTOR);
  const expectedRest = Math.round(avgDaily * afterNoonShare * NET_FACTOR);

  // payouts: link the failed one with its retry via the backup bank
  const failed = PAYOUTS.find((p) => p.status === "failed");
  const retry = PAYOUTS.find((p) => p.id.endsWith("-r"));
  const payouts: PayoutRow[] = PAYOUTS.map((p) => ({
    id: p.id,
    amount: p.amount,
    status: p.status,
    createdAt: p.createdAt,
    paidAt: p.paidAt,
    destination: p.destination,
    route: p.id.endsWith("-r") ? "backup" : "primary",
    splits: p.splits,
    retryId: failed && p.id === failed.id ? retry?.id : undefined,
    retryOf: retry && p.id === retry.id ? failed?.id : undefined,
  }));

  // fee tier: November so far vs thresholds
  const novStart = Date.UTC(2026, 10, 1) - 3 * HOUR;
  const octStart = Date.UTC(2026, 9, 1) - 3 * HOUR;
  const decStart = Date.UTC(2026, 11, 1) - 3 * HOUR;
  const monthTurnover = sumRevenue(novStart, NOW_MS + DAY);
  const prevMonthTurnover = sumRevenue(octStart, novStart);
  const daysLeftInMonth = (decStart - NOW_MS) / DAY;
  const yearEnd = Date.UTC(2027, 0, 1) - 3 * HOUR;
  const daysLeftInYear = (yearEnd - NOW_MS) / DAY;

  // An НПД receipt is formed at the moment of payment (422-ФЗ) and registers within about a minute —
  // it never waits for in-game delivery. Only a payment younger than a minute is still «registering».
  const receiptPending = (o: Order) => o.receipt?.status === "pending" && NOW_MS - new Date(o.createdAt).getTime() < RECEIPT_REGISTER_MS;
  const receipts: ReceiptRow[] = getOrders({})
    .filter(isPaid)
    .slice(0, 9)
    .map((o) => {
      const pending = receiptPending(o);
      return {
        orderId: o.id,
        number: pending ? undefined : (o.receipt?.number ?? receiptNumberFor(o.id)),
        at: o.createdAt,
        player: o.playerName,
        item: o.items.map((it) => (it.qty > 1 ? `${it.name} ×${it.qty}` : it.name)).join(", "),
        amount: o.amount,
        status: pending ? "pending" : "sent",
        awaitingDelivery: WAITING_DELIVERY.includes(o.status),
      };
    });
  const receiptsPending = getOrders({ days: 1 }).filter((o) => isPaid(o) && receiptPending(o)).length;

  // «Чистый доход · 30 дней» uses the same calendar window as getKpis(30) on the overview:
  // the last 30 days including today until NOW, so its gross equals «Выручка · 30 дней».
  const net30 = DAILY.slice(-30).map((d) => ({ date: d.date, gross: d.revenue, net: Math.round(d.revenue * NET_FACTOR) }));

  const todayPayout = PAYOUTS.find((p) => new Date(p.createdAt).getTime() >= mskDayStart(0) && !p.id.endsWith("-r"));

  return {
    balance: BALANCE,
    ordersToday: todayOrders.length,
    todayPayout: todayPayout ? { amount: todayPayout.amount, createdAt: todayPayout.createdAt, status: todayPayout.status } : null,
    nextPayout: {
      at: BALANCE.nextPayoutAt,
      inMs: new Date(BALANCE.nextPayoutAt).getTime() - NOW_MS,
      estimate: earnedToday + expectedRest,
      earnedToday,
      expectedRest,
    },
    members: TEAM.map((m) => ({
      id: m.id,
      name: m.name,
      email: m.email,
      role: m.role,
      splitPct: m.splitPct,
      payoutDestination: m.payoutDestination,
      taxStatus: m.taxStatus,
    })),
    payouts,
    incident:
      failed && retry
        ? { failedId: failed.id, retryId: retry.id, amount: failed.amount, failedAt: failed.createdAt, retryAt: retry.createdAt, paidAt: retry.paidAt ?? retry.createdAt }
        : null,
    dailyNet: net30.map((d) => ({ date: d.date, net: d.net })),
    net30: {
      from: net30[0].date,
      to: net30[net30.length - 1].date,
      gross: net30.reduce((a, d) => a + d.gross, 0),
      net: net30.reduce((a, d) => a + d.net, 0),
      fee: net30.reduce((a, d) => a + (d.gross - d.net), 0),
    },
    tier: {
      label: PLAN_META.pro.label,
      rate: PLAN_FEES.pro * 100,
      monthTurnover,
      monthForecast: Math.round(monthTurnover + avgDaily * daysLeftInMonth),
      prevMonthTurnover,
      prevMonthFee: Math.round(prevMonthTurnover * PLAN_FEES.pro),
      savedVsStart: Math.round(prevMonthTurnover * (PLAN_FEES.start - PLAN_FEES.pro)),
      floor: TIER_THRESHOLDS.pro,
      next: TIER_THRESHOLDS.network,
      nextLabel: PLAN_META.network.label,
      nextRate: PLAN_FEES.network * 100,
    },
    tax: {
      yearIncome: TAX.yearIncome,
      limit: TAX.limit,
      projected: Math.round(TAX.yearIncome + avgDaily * NET_FACTOR * OWNER_SHARE * daysLeftInYear),
      receiptsIssued: TAX.receiptsIssued,
      receiptsPending,
      taxDue: TAX.taxDue,
      rate: TAX.rate,
      ownerShare: OWNER_SHARE,
      avgDailyIncome: Math.round(avgDaily * NET_FACTOR * OWNER_SHARE),
      daysLeft: Math.round(daysLeftInYear),
    },
    receipts,
    now: NOW_MS,
  };
}

export default async function FinancePage({ searchParams }: PageProps<"/dashboard/finance">) {
  const sp = await searchParams;
  const rawTab = typeof sp.tab === "string" ? sp.tab : "overview";
  const tab: FinanceTab = (FINANCE_TABS as readonly string[]).includes(rawTab) ? (rawTab as FinanceTab) : "overview";
  const payoutOpen = sp.payout === "1";

  return <FinanceView data={buildFinanceData()} initialTab={tab} initialPayoutOpen={payoutOpen} />;
}
