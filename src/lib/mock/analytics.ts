/**
 * Aggregates for analytics, finance and activity — derived from ORDERS where
 * the orders exist (last 60 days) and extrapolated before that.
 */
import { createRng } from "@/lib/utils";
import { COUNTRIES, PAYMENT_METHODS } from "@/lib/payments";
import { PRODUCT_INDEX, ORDERS, ORDER_LOG_DAYS, PLAYERS, isPaid } from "./orders";
import { CAMPAIGNS, SERVERS, TEAM } from "./catalog";
import { DAY, HOUR, MINUTE, NOW_MS, ago, mskDayStart } from "./now";
import type {
  ActivityEvent,
  Balance,
  CountryCode,
  DailyPoint,
  ForecastPoint,
  FunnelStep,
  PaymentMethod,
  Payout,
  TaxSummary,
} from "./types";

const rng = createRng(4242);
const int = (a: number, b: number) => Math.floor(a + rng() * (b - a + 1));

/* ───────────── Daily series (120 days) ───────────── */

const byDay = new Map<number, typeof ORDERS>();
for (const o of ORDERS) {
  const t = new Date(o.createdAt).getTime();
  const d = Math.floor((mskDayStart(0) + DAY - 1 - t) / DAY); // 0 = today
  const list = byDay.get(d);
  if (list) list.push(o);
  else byDay.set(d, [o]);
}

const firstOrderDay = new Map<string, number>();
for (const o of ORDERS) {
  const t = new Date(o.createdAt).getTime();
  if (!firstOrderDay.has(o.playerId)) firstOrderDay.set(o.playerId, Math.floor((mskDayStart(0) + DAY - 1 - t) / DAY));
}

export const DAILY_DAYS = 200;

export const DAILY: DailyPoint[] = [];
for (let d = DAILY_DAYS - 1; d >= 0; d--) {
  const start = mskDayStart(d);
  const dow = new Date(start + 3 * HOUR).getUTCDay();
  const weekend = dow === 0 || dow === 6;
  const progress = (DAILY_DAYS - 1 - d) / (DAILY_DAYS - 1);
  const peakOnline = Math.round((210 + 290 * Math.pow(progress, 0.8)) * (weekend ? 1.12 : 1) * (0.94 + rng() * 0.1));
  const uniquePlayers = Math.round(peakOnline * (4.4 + rng() * 0.6));
  const orders = byDay.get(d);
  if (orders) {
    const paid = orders.filter(isPaid);
    const buyers = new Set(paid.map((o) => o.playerId));
    let newBuyers = 0;
    for (const id of buyers) if (firstOrderDay.get(id) === d) newBuyers++;
    DAILY.push({
      date: new Date(start).toISOString(),
      revenue: paid.reduce((a, o) => a + o.amount, 0),
      orders: paid.length,
      buyers: buyers.size,
      // the first weeks of the log would count every returning buyer as "new"
      newBuyers: d >= ORDER_LOG_DAYS - 15 ? Math.round(buyers.size * 0.42) : newBuyers,
      peakOnline: d === 0 ? Math.round(peakOnline * 0.62) : peakOnline,
      uniquePlayers: d === 0 ? Math.round(uniquePlayers * 0.48) : uniquePlayers,
      refunds: orders.length - paid.length,
    });
  } else {
    // before the order log window — extrapolate the ramp-up since launch
    const pre = (DAILY_DAYS - 1 - d) / (DAILY_DAYS - 1 - ORDER_LOG_DAYS);
    const base = 6200 + 6400 * Math.min(1, pre);
    const revenue = Math.round(base * (weekend ? 1.2 : 1) * (0.85 + rng() * 0.3));
    const count = Math.round(revenue / (300 + rng() * 30));
    const buyers = Math.round(count * 0.86);
    DAILY.push({
      date: new Date(start).toISOString(),
      revenue,
      orders: count,
      buyers,
      newBuyers: Math.round(buyers * 0.4),
      peakOnline,
      uniquePlayers,
      refunds: rng() < 0.4 ? 1 : 0,
    });
  }
}

/* ───────────── Heatmap: weekday × hour (MSK), last 30 days ───────────── */

export const HOURLY_HEATMAP: number[][] = Array.from({ length: 7 }, () => Array.from({ length: 24 }, () => 0));
for (const o of ORDERS) {
  const t = new Date(o.createdAt).getTime();
  if (NOW_MS - t > 30 * DAY || !isPaid(o)) continue;
  const m = new Date(t + 3 * HOUR);
  const dow = (m.getUTCDay() + 6) % 7; // Mon = 0
  HOURLY_HEATMAP[dow][m.getUTCHours()] += o.amount;
}

/* ───────────── Splits (last 30 days) ───────────── */

const last30 = ORDERS.filter((o) => isPaid(o) && NOW_MS - new Date(o.createdAt).getTime() <= 30 * DAY);

function split<K extends string>(keyOf: (o: (typeof ORDERS)[number]) => K) {
  const map = new Map<K, { amount: number; count: number }>();
  for (const o of last30) {
    const k = keyOf(o);
    const v = map.get(k) ?? { amount: 0, count: 0 };
    v.amount += o.amount;
    v.count += 1;
    map.set(k, v);
  }
  const total = last30.reduce((a, o) => a + o.amount, 0) || 1;
  return [...map.entries()]
    .map(([key, v]) => ({ key, amount: v.amount, count: v.count, share: v.amount / total }))
    .sort((a, b) => b.amount - a.amount);
}

export const METHOD_SPLIT = split<PaymentMethod>((o) => o.method).map((s) => ({ ...s, label: PAYMENT_METHODS[s.key].label }));
export const COUNTRY_SPLIT = split<CountryCode>((o) => o.country).map((s) => ({ ...s, label: COUNTRIES[s.key].name }));
export const CATEGORY_SPLIT = (() => {
  const map = new Map<string, number>();
  for (const o of last30) {
    const gross = o.items.reduce((a, it) => a + it.price * it.qty, 0) || 1;
    for (const it of o.items) {
      const cat = PRODUCT_INDEX.get(it.productId)?.category ?? "Другое";
      map.set(cat, (map.get(cat) ?? 0) + Math.round((it.price * it.qty * o.amount) / gross));
    }
  }
  const total = [...map.values()].reduce((a, b) => a + b, 0) || 1;
  return [...map.entries()].map(([label, amount]) => ({ label, amount, share: amount / total })).sort((a, b) => b.amount - a.amount);
})();

export const SERVER_SPLIT = (() => {
  const map = new Map<string, number>();
  for (const o of last30) map.set(o.serverId, (map.get(o.serverId) ?? 0) + o.amount);
  return SERVERS.filter((s) => s.projectId === "arctic").map((s) => ({ id: s.id, label: s.name, amount: map.get(s.id) ?? 0 }));
})();

/* ───────────── Funnel (storefront, last 30 days) ───────────── */

const paid30 = last30.length;
export const FUNNEL: FunnelStep[] = [
  { id: "visits", label: "Визиты витрины", value: Math.round(paid30 * 31.4) },
  { id: "views", label: "Открыли товар", value: Math.round(paid30 * 14.8) },
  { id: "checkout", label: "Начали оплату", value: Math.round(paid30 * 2.26) },
  { id: "paid", label: "Оплатили", value: paid30 },
  { id: "delivered", label: "Получили в игре", value: last30.filter((o) => o.status === "delivered").length },
];

/* ───────────── Forecast (next 30 days) ───────────── */

export const FORECAST: ForecastPoint[] = (() => {
  const recent = DAILY.slice(-29, -1); // full days only
  const avg = recent.reduce((a, d) => a + d.revenue, 0) / recent.length;
  const out: ForecastPoint[] = [];
  for (let i = 1; i <= 30; i++) {
    const t = mskDayStart(0) + i * DAY;
    const m = new Date(t + 3 * HOUR);
    const dow = m.getUTCDay();
    const md = (m.getUTCMonth() + 1) * 100 + m.getUTCDate();
    const bf = md >= 1127 && md <= 1130 ? 1.9 : 1;
    const wipe = md === 1201 ? 1.7 : 1;
    const mid = avg * (1 + i * 0.004) * (dow === 0 || dow === 6 ? 1.18 : 0.97) * bf * wipe;
    const spread = 0.07 + i * 0.004;
    out.push({ date: new Date(t).toISOString(), low: Math.round(mid * (1 - spread)), mid: Math.round(mid), high: Math.round(mid * (1 + spread)) });
  }
  return out;
})();

/* ───────────── Money ───────────── */

const todayOrders = byDay.get(0) ?? [];
const todayPaid = todayOrders.filter(isPaid);

export const BALANCE: Balance = {
  available: Math.round(todayPaid.filter((o) => o.method === "sbp").reduce((a, o) => a + o.net, 0) + 6_420),
  pending: Math.round(todayPaid.filter((o) => o.method !== "sbp").reduce((a, o) => a + o.net, 0)),
  reserved: 6_000,
  nextPayoutAt: new Date(mskDayStart(0) + DAY + 12 * HOUR).toISOString(),
  todayGross: todayPaid.reduce((a, o) => a + o.amount, 0),
};

const SPLIT_MEMBERS = TEAM.filter((m) => m.splitPct > 0);

export const PAYOUTS: Payout[] = (() => {
  const out: Payout[] = [];
  for (let d = 30; d >= 0; d--) {
    const day = DAILY[DAILY.length - 1 - (d + 1)]; // payout covers the previous day
    if (!day) continue;
    const gross = Math.round(day.revenue * 0.961);
    const createdAt = new Date(mskDayStart(d) + 12 * HOUR).toISOString();
    const failed = d === 12;
    const status = d === 0 ? "processing" : failed ? "failed" : "paid";
    out.push({
      id: `po-${String(2026_1106 - d)}`,
      amount: gross,
      fee: 0,
      method: "sbp",
      destination: "Разделено между участниками",
      status,
      createdAt,
      paidAt: status === "paid" ? new Date(mskDayStart(d) + 12 * HOUR + int(40, 280) * 1000).toISOString() : undefined,
      splits: SPLIT_MEMBERS.map((m) => ({ memberId: m.id, amount: Math.round((gross * m.splitPct) / 100) })),
    });
    if (failed) {
      // retried via the backup bank 40 minutes later
      out.push({
        id: `po-${String(2026_1106 - d)}-r`,
        amount: gross,
        fee: 0,
        method: "sbp",
        destination: "Резервный маршрут · Точка",
        status: "paid",
        createdAt: new Date(mskDayStart(d) + 12 * HOUR + 40 * MINUTE).toISOString(),
        paidAt: new Date(mskDayStart(d) + 12 * HOUR + 42 * MINUTE).toISOString(),
        splits: SPLIT_MEMBERS.map((m) => ({ memberId: m.id, amount: Math.round((gross * m.splitPct) / 100) })),
      });
    }
  }
  return out.reverse();
})();

export const TAX: TaxSummary = (() => {
  const monthStart = Date.UTC(2026, 9, 1) - 3 * HOUR;
  const monthEnd = Date.UTC(2026, 10, 1) - 3 * HOUR;
  const october = ORDERS.filter((o) => isPaid(o) && new Date(o.createdAt).getTime() >= monthStart && new Date(o.createdAt).getTime() < monthEnd).reduce((a, o) => a + o.amount, 0);
  const ownerShare = 0.6;
  // year-to-date: the series covers almost the whole life of the project (launched mid-March)
  const ytdGross = DAILY.reduce((a, d) => a + d.revenue, 0) + 96_400;
  return {
    regime: "npd",
    yearIncome: Math.round(ytdGross * 0.961 * ownerShare),
    limit: 2_400_000,
    receiptsIssued: ORDERS.filter((o) => o.receipt?.status === "sent").length + 9_412,
    receiptsPending: ORDERS.filter((o) => o.receipt?.status === "pending").length,
    taxDue: Math.round(october * ownerShare * 0.04),
    rate: 4,
  };
})();

/* ───────────── Activity feed ───────────── */

export const ACTIVITY: ActivityEvent[] = (() => {
  const ev: ActivityEvent[] = [];
  const recentOrders = ORDERS.slice(-14).reverse();
  for (const o of recentOrders) {
    const label = o.items.map((it) => (it.qty > 1 ? `${it.name} ×${it.qty}` : it.name)).join(", ");
    if (o.status === "failed") {
      ev.push({ id: `a-${o.id}`, kind: "delivery_failed", title: `Не выдано: ${label}`, description: `${o.playerName} · плагин PlayerPoints не найден на «Анархии»`, at: o.createdAt, href: `/dashboard/orders?id=${o.id}`, amount: o.amount });
    } else if (o.status === "retrying") {
      ev.push({ id: `a-${o.id}`, kind: "delivery_failed", title: `Выдача ждёт сервер: ${label}`, description: `${o.playerName} · повторим автоматически`, at: o.createdAt, href: `/dashboard/orders?id=${o.id}`, amount: o.amount });
    } else if (o.status === "awaiting_player") {
      ev.push({ id: `a-${o.id}`, kind: "awaiting_player", title: `Ждёт входа игрока: ${label}`, description: `${o.playerName} офлайн — выдадим при входе`, at: o.createdAt, href: `/dashboard/orders?id=${o.id}`, amount: o.amount });
    } else {
      ev.push({ id: `a-${o.id}`, kind: "order", title: `${o.playerName} купил ${label}`, description: `${PAYMENT_METHODS[o.method].label} · выдано за ${o.deliveryMs ? (o.deliveryMs < 1000 ? `${o.deliveryMs} мс` : `${(o.deliveryMs / 1000).toFixed(1).replace(".", ",")} с`) : "—"}`, at: o.createdAt, href: `/dashboard/orders?id=${o.id}`, amount: o.amount });
    }
  }
  const sky = SERVERS.find((s) => s.id === "srv-skyblock")!;
  ev.push({ id: "a-sky", kind: "server_offline", title: "SkyBlock не на связи", description: "Задания копятся в очереди: 12 команд. Уведомление ушло в Telegram.", at: sky.lastSeenAt, href: "/dashboard/servers" });
  ev.push({ id: "a-fraud", kind: "fraud_blocked", title: "Платёж отклонён антифродом", description: "Карта в общем чёрном списке PayMC · 990 ₽", at: ago(2 * HOUR + 12 * MINUTE), href: "/dashboard/players" });
  ev.push({ id: "a-payout", kind: "payout", title: "Выплата отправлена", description: "Разделена между 3 участниками по СБП", at: new Date(mskDayStart(0) + 12 * HOUR).toISOString(), href: "/dashboard/finance", amount: PAYOUTS[0]?.amount });
  ev.push({ id: "a-camp", kind: "campaign", title: "«Вернуть в корзину» принесла 2 140 ₽ за утро", description: "7 игроков оплатили после напоминания в чате", at: ago(3 * HOUR + 5 * MINUTE), href: "/dashboard/campaigns" });
  ev.push({ id: "a-receipts", kind: "receipt", title: "Чеки за вчера зарегистрированы", description: "«Мой налог» · 0 ошибок", at: ago(11 * HOUR + 2 * MINUTE), href: "/dashboard/finance" });
  ev.push({ id: "a-anarchy", kind: "delivery_failed", title: "«Анархия» отвечает медленно", description: "TPS 16,8, задержка агента 640 мс. Плагин PayMC устарел: 2.3.0 → 2.4.1", at: ago(52 * MINUTE), href: "/dashboard/servers" });
  ev.push({ id: "a-member", kind: "member", title: "Денис Орлов принял приглашение", description: "Роль: модератор", at: ago(26 * HOUR), href: "/dashboard/settings" });
  const cb = ORDERS.filter((o) => o.status === "chargeback").pop();
  if (cb) ev.push({ id: "a-cb", kind: "chargeback", title: "Чарджбэк: привилегия снята автоматически", description: `${cb.playerName} · игрок добавлен в чёрный список`, at: new Date(new Date(cb.createdAt).getTime() + 6 * DAY).toISOString(), href: `/dashboard/orders?id=${cb.id}`, amount: cb.amount });
  return ev.filter((e) => new Date(e.at).getTime() <= NOW_MS).sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
})();

/* ───────────── Small helpers for dashboards ───────────── */

export const ONLINE_NOW = SERVERS.filter((s) => s.projectId === "arctic").reduce((a, s) => a + s.online, 0);
export const BUYERS_ONLINE = PLAYERS.filter((p) => p.online && p.orders > 0).length;
export const CAMPAIGN_REVENUE_30D = CAMPAIGNS.reduce((a, c) => a + c.stats.revenue, 0);
