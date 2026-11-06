import { NOW_MS, DAY, mskDayStart } from "./now";

/** Start of a calendar window of `days` days ending today (MSK) — matches DAILY.slice(-days). */
export function windowStart(days: number, offsetDays = 0) {
  return mskDayStart(days - 1 + offsetDays);
}
import { DAILY } from "./analytics";
import { SERVERS } from "./catalog";
import { ORDERS, ORDER_INDEX, ORDER_LOG_DAYS, PLAYERS, PLAYER_BY_NAME, PLAYER_INDEX, PRODUCTS, PRODUCT_INDEX, ordersByPlayer, isPaid } from "./orders";
import { withTrace } from "./trace";
import type { Order, OrderStatus, PaymentMethod, PlayerSegment } from "./types";

export interface OrderFilters {
  status?: OrderStatus | "issues" | "all";
  method?: PaymentMethod | "all";
  serverId?: string | "all";
  query?: string;
  /** days back from NOW */
  days?: number;
  productId?: string;
  playerId?: string;
}

const ISSUE_STATUSES: OrderStatus[] = ["failed", "retrying"];

/** Newest first. */
export function getOrders(f: OrderFilters = {}): Order[] {
  const q = f.query?.trim().toLowerCase();
  const from = f.days ? windowStart(f.days) : 0;
  const out: Order[] = [];
  for (let i = ORDERS.length - 1; i >= 0; i--) {
    const o = ORDERS[i];
    if (from && new Date(o.createdAt).getTime() < from) break;
    if (f.status && f.status !== "all") {
      if (f.status === "issues" ? !ISSUE_STATUSES.includes(o.status) : o.status !== f.status) continue;
    }
    if (f.method && f.method !== "all" && o.method !== f.method) continue;
    if (f.serverId && f.serverId !== "all" && o.serverId !== f.serverId) continue;
    if (f.productId && !o.items.some((it) => it.productId === f.productId)) continue;
    if (f.playerId && o.playerId !== f.playerId) continue;
    if (q) {
      const hay = `${o.id} ${o.playerName} ${o.items.map((it) => it.name).join(" ")} ${o.promoCode ?? ""} ${o.creatorCode ?? ""}`.toLowerCase();
      if (!hay.includes(q)) continue;
    }
    out.push(o);
  }
  return out;
}

/** Full order with its delivery trace. */
export function getOrder(id: string): Order | undefined {
  const o = ORDER_INDEX.get(id);
  return o ? withTrace(o) : undefined;
}

export const getPlayer = (id: string) => PLAYER_INDEX.get(id);
export const getPlayerByName = (name: string) => PLAYER_BY_NAME.get(name.toLowerCase());
export const getProduct = (id: string) => PRODUCT_INDEX.get(id);
export const getServer = (id: string) => SERVERS.find((s) => s.id === id);

export function getOrdersByPlayer(playerId: string): Order[] {
  return [...(ordersByPlayer.get(playerId) ?? [])].reverse();
}

export function getOrdersByProduct(productId: string, limit = 50): Order[] {
  return getOrders({ productId }).slice(0, limit);
}

export function getPlayers(f: { segment?: PlayerSegment | "all"; query?: string; online?: boolean; flagged?: boolean; sort?: "ltv" | "recent" | "orders" | "risk" } = {}) {
  const q = f.query?.trim().toLowerCase();
  let list = PLAYERS.filter((p) => {
    if (f.segment && f.segment !== "all" && p.segment !== f.segment) return false;
    if (f.online && !p.online) return false;
    if (f.flagged && p.flags.length === 0) return false;
    if (q && !`${p.name} ${p.externalId} ${p.telegram ?? ""}`.toLowerCase().includes(q)) return false;
    return true;
  });
  const sort = f.sort ?? "ltv";
  list = [...list].sort((a, b) =>
    sort === "ltv"
      ? b.ltv - a.ltv
      : sort === "orders"
        ? b.orders - a.orders
        : sort === "risk"
          ? b.risk - a.risk
          : new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime(),
  );
  return list;
}

export function getDailySeries(days: number) {
  return DAILY.slice(-days);
}

function sumRange(days: number, offset: number, key: "revenue" | "orders" | "buyers" | "uniquePlayers" | "refunds" | "newBuyers") {
  const end = DAILY.length - offset;
  return DAILY.slice(Math.max(0, end - days), end).reduce((a, d) => a + d[key], 0);
}

function avgRange(days: number, offset: number, key: "peakOnline") {
  const end = DAILY.length - offset;
  const slice = DAILY.slice(Math.max(0, end - days), end);
  return slice.reduce((a, d) => a + d[key], 0) / (slice.length || 1);
}

export interface Kpis {
  revenue: number;
  revenuePrev: number;
  orders: number;
  ordersPrev: number;
  avgCheck: number;
  avgCheckPrev: number;
  buyers: number;
  buyersPrev: number;
  /** buyers / unique players, % */
  conversion: number;
  conversionPrev: number;
  /** revenue per average peak-online player for the period */
  revenuePerOnline: number;
  revenuePerOnlinePrev: number;
  refundsRate: number;
}

function exactDistinctBuyers(from: number, to: number) {
  const set = new Set<string>();
  for (const o of ORDERS) {
    const t = new Date(o.createdAt).getTime();
    if (t >= from && t < to && isPaid(o)) set.add(o.playerId);
  }
  return set.size;
}

/**
 * Distinct paying players in [NOW - (offset+days), NOW - offset).
 * Outside the order log we scale daily buyer sums by the ratio observed in the log.
 */
function distinctBuyers(days: number, offset: number) {
  const from = windowStart(days, offset);
  const to = offset === 0 ? NOW_MS + 1 : windowStart(offset);
  if (from >= NOW_MS - ORDER_LOG_DAYS * DAY) return exactDistinctBuyers(from, to);
  const ratio = exactDistinctBuyers(windowStart(days), NOW_MS + 1) / (sumRange(days, 0, "buyers") || 1);
  return Math.round(sumRange(days, offset, "buyers") * ratio);
}

/** Distinct active players over a window ≈ average daily uniques × overlap factor. */
function activePlayers(days: number, offset: number) {
  const end = DAILY.length - offset;
  const slice = DAILY.slice(Math.max(0, end - days), end);
  const avg = slice.reduce((a, d) => a + d.uniquePlayers, 0) / (slice.length || 1);
  const factor = days <= 7 ? 2.1 : days <= 30 ? 3.4 : 5.2;
  return Math.round(avg * factor);
}

/** KPIs for the last `days` days vs the previous period. */
/** Paid revenue and order count in [from, to) from the order log. */
function paidBetween(from: number, to: number) {
  let revenue = 0;
  let orders = 0;
  for (const o of ORDERS) {
    const t = new Date(o.createdAt).getTime();
    if (t >= from && t < to && isPaid(o)) {
      revenue += o.amount;
      orders += 1;
    }
  }
  return { revenue, orders };
}

/**
 * Previous period of the same length as the current one, which ends «now» (today is
 * only partly over). Within the order log it is exact; beyond it the last day of the
 * previous window is scaled by the share of a typical day that has passed by now.
 */
function previousPeriod(days: number) {
  const elapsedToday = NOW_MS - mskDayStart(0);
  const from = windowStart(days, days);
  const to = from + (days - 1) * DAY + elapsedToday;
  if (from >= NOW_MS - ORDER_LOG_DAYS * DAY) return paidBetween(from, to);
  let share = 0;
  let n = 0;
  for (let d = 1; d <= 14; d++) {
    const start = mskDayStart(d);
    const part = paidBetween(start, start + elapsedToday).revenue;
    const full = paidBetween(start, start + DAY).revenue;
    if (full > 0) {
      share += part / full;
      n += 1;
    }
  }
  share = n ? share / n : 0.25;
  const lastIdx = DAILY.length - 1 - days;
  const last = DAILY[lastIdx];
  return {
    revenue: Math.round(sumRange(days, days, "revenue") - (last ? last.revenue * (1 - share) : 0)),
    orders: Math.round(sumRange(days, days, "orders") - (last ? last.orders * (1 - share) : 0)),
  };
}

export function getKpis(days: 7 | 30 | 90): Kpis {
  const revenue = sumRange(days, 0, "revenue");
  const orders = sumRange(days, 0, "orders");
  const prev = previousPeriod(days);
  const revenuePrev = prev.revenue;
  const ordersPrev = prev.orders;
  const buyers = distinctBuyers(days, 0);
  const buyersPrev = distinctBuyers(days, days);
  const uniq = activePlayers(days, 0);
  const uniqPrev = activePlayers(days, days);
  const online = avgRange(days, 0, "peakOnline");
  const onlinePrev = avgRange(days, days, "peakOnline");
  const refunds = sumRange(days, 0, "refunds");
  return {
    revenue,
    revenuePrev,
    orders,
    ordersPrev,
    avgCheck: orders ? Math.round(revenue / orders) : 0,
    avgCheckPrev: ordersPrev ? Math.round(revenuePrev / ordersPrev) : 0,
    buyers,
    buyersPrev,
    conversion: uniq ? (buyers / uniq) * 100 : 0,
    conversionPrev: uniqPrev ? (buyersPrev / uniqPrev) * 100 : 0,
    revenuePerOnline: online ? Math.round(revenue / online) : 0,
    revenuePerOnlinePrev: onlinePrev ? Math.round(revenuePrev / onlinePrev) : 0,
    refundsRate: orders ? (refunds / (orders + refunds)) * 100 : 0,
  };
}

/** % change helper: pct(cur, prev) → 12.4 */
export function pct(cur: number, prev: number) {
  if (!prev) return 0;
  return ((cur - prev) / prev) * 100;
}

/** Orders and servers that need attention right now. */
export function getIssues() {
  const orders = ORDERS.filter((o) => o.status === "failed" || o.status === "retrying").reverse();
  const awaiting = ORDERS.filter((o) => o.status === "awaiting_player").reverse();
  const servers = SERVERS.filter((s) => s.projectId === "arctic" && s.status !== "online");
  return { orders, awaiting, servers, count: orders.length };
}

export function getTopProducts(n = 5) {
  return [...PRODUCTS].filter((p) => p.status === "active").sort((a, b) => b.revenue30d - a.revenue30d).slice(0, n);
}

export function getRecentOrders(n = 10) {
  return ORDERS.slice(-n).reverse();
}

export { isPaid };
