/**
 * Deterministic generation of players and 60 days of orders for ArcticMC.
 * Everything downstream (product stats, promo/creator usage, player LTV,
 * daily analytics) is computed from these orders, so numbers always agree.
 *
 * ORDERS[i].trace is empty to keep payloads small — use withTrace()/getOrder().
 */
import { createRng } from "@/lib/utils";
import { MOBILE_FEE, PLAN_FEES } from "@/lib/payments";
import { CAMPAIGNS, CREATOR_SEEDS, CURRENT_PROJECT_ID, PRODUCT_SEEDS, PROMO_SEEDS, SERVERS } from "./catalog";
import { DAY, HOUR, MINUTE, NOW_MS, mskDayStart } from "./now";
import type {
  CountryCode,
  Creator,
  Order,
  OrderItem,
  OrderStatus,
  PaymentMethod,
  Player,
  PlayerFlag,
  PlayerSegment,
  Product,
  PromoCode,
} from "./types";

const rng = createRng(61106);
const r = () => rng();
const int = (min: number, max: number) => Math.floor(min + r() * (max - min + 1));

function weightedIndex(weights: number[]) {
  let total = 0;
  for (const w of weights) total += w;
  let x = r() * total;
  for (let i = 0; i < weights.length; i++) {
    x -= weights[i];
    if (x <= 0) return i;
  }
  return weights.length - 1;
}

function weighted<T>(items: readonly T[], weights: readonly number[]): T {
  return items[weightedIndex(weights as number[])];
}

/* ───────────── Players ───────────── */

const BASES = [
  "kotik", "d1ma", "Sanya", "Lexa", "pelmen", "MrBorsch", "Zheka", "nastya", "frost", "Tihon", "Arbuz", "Kirpich",
  "yasha", "Grib", "Ezhik", "Vovan", "Mops", "Bublik", "TemaGG", "KiRiLL", "Shadow", "DarkWolf", "Ledok", "Sneg",
  "Pinguin", "Polar", "Morozko", "Belka", "Kefir", "Sushka", "Batya", "Sonya", "Masha", "Vika", "Liza", "Kostya",
  "Egor", "Maks", "Artem", "Danya", "Nikitos", "Vanya", "Petya", "Gosha", "Fedya", "Stepa", "Timur", "Ruslan",
  "Arsen", "Aidar", "Bauyr", "Daulet", "Ermek", "Ilya", "Misha", "Pasha", "Serega", "Tolik", "Yura", "Zlata",
  "Alisa", "Kira", "Lena", "Polina", "Ulyana", "Dasha", "Katya", "Olya", "Vlad", "Gleb", "Mark", "Oleg", "Roma",
  "Slava", "Lev", "Bogdan", "Matvey", "Savva", "Kuzya", "Toha", "Lyoha", "Shurik", "Vitek", "Zhora", "Kolyan",
  "Kuzmich", "Pirozhok", "Sirok", "Plombir", "Kompot", "Shaurma", "Chebupel", "Pryanik", "Ded_Moroz", "Snegovik",
];
const SUFFIXES = [
  "", "228", "_pro", "1337", "_mc", "777", "2011", "2012", "_rus", "YT", "_off", "99", "_play", "GG", "007",
  "_ice", "2010", "_top", "13", "TV", "_real", "1", "2", "_x", "2013", "_yt", "_kz", "_by", "42", "_love",
];

function makeNick(): string {
  const base = BASES[int(0, BASES.length - 1)];
  const suf = SUFFIXES[int(0, SUFFIXES.length - 1)];
  const style = r();
  if (style < 0.06) return `xX${base}Xx`;
  if (style < 0.12) return `${base.toLowerCase()}${suf}`;
  if (style < 0.16) return `${base}_${base.length > 4 ? "" : "the"}${suf || "best"}`.replace("__", "_");
  return `${base}${suf}`;
}

function uuid() {
  const hex = () => Math.floor(r() * 16).toString(16);
  const part = (n: number) => Array.from({ length: n }, hex).join("");
  return `${part(8)}-${part(4)}-4${part(3)}-${"89ab"[int(0, 3)]}${part(3)}-${part(12)}`;
}

const COUNTRY_W: [CountryCode, number][] = [
  ["RU", 86], ["KZ", 6], ["BY", 4], ["UZ", 1.5], ["AM", 1], ["KG", 0.8], ["GE", 0.4], ["DE", 0.3],
];
const HOME_SERVERS = ["srv-survival", "srv-anarchy", "srv-skyblock", "srv-lobby"] as const;
const HOME_W = [55, 25, 13, 7];

interface PlayerDraft {
  id: string;
  name: string;
  externalId: string;
  country: CountryCode;
  firstSeen: number;
  home: (typeof HOME_SERVERS)[number];
  weight: number;
  buyer: boolean;
  /** hours per active day */
  intensity: number;
}

const PLAYER_COUNT = 1180;
const PROJECT_AGE_DAYS = Math.floor((NOW_MS - Date.UTC(2026, 2, 14, 16)) / DAY);

const drafts: PlayerDraft[] = [];
{
  const used = new Set<string>();
  // hand-made nicknames used across the demo (hero, docs, screenshots)
  const SPECIAL: { name: string; weight: number; days: number }[] = [
    { name: "kotik228", weight: 34, days: 190 },
    { name: "Steve_Pro", weight: 18, days: 140 },
    { name: "d1ma_rust", weight: 6, days: 75 },
  ];
  for (const s of SPECIAL) {
    used.add(s.name.toLowerCase());
    drafts.push({
      id: `pl-${String(drafts.length + 1).padStart(4, "0")}`,
      name: s.name,
      externalId: uuid(),
      country: "RU",
      firstSeen: NOW_MS - s.days * DAY - int(0, 23) * HOUR,
      home: "srv-survival",
      weight: s.weight,
      buyer: true,
      intensity: 2.4,
    });
  }
  while (drafts.length < PLAYER_COUNT) {
    const name = makeNick();
    const key = name.toLowerCase();
    if (used.has(key) || name.length > 16 || name.length < 3) continue;
    used.add(key);
    const tenure = Math.floor(PROJECT_AGE_DAYS * Math.pow(r(), 1.35));
    drafts.push({
      id: `pl-${String(drafts.length + 1).padStart(4, "0")}`,
      name,
      externalId: uuid(),
      country: weighted(COUNTRY_W.map((c) => c[0]), COUNTRY_W.map((c) => c[1])),
      firstSeen: NOW_MS - tenure * DAY - int(0, 23) * HOUR - int(0, 59) * MINUTE,
      home: weighted(HOME_SERVERS, HOME_W),
      weight: Math.min(60, Math.pow(1 - r() * 0.999, -1.2)),
      buyer: r() < 0.78,
      intensity: 0.4 + r() * 2.6,
    });
  }
}

// buyers sorted by firstSeen for "eligible at time t" sampling
const buyers = drafts.filter((d) => d.buyer).sort((a, b) => a.firstSeen - b.firstSeen);
const cumWeights: number[] = [];
{
  let acc = 0;
  for (const b of buyers) {
    acc += b.weight;
    cumWeights.push(acc);
  }
}

function pickBuyer(at: number): PlayerDraft {
  // eligible = players first seen before `at`
  let lo = 0;
  let hi = buyers.length - 1;
  let last = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (buyers[mid].firstSeen <= at) {
      last = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  if (last < 0) return buyers[0];
  const total = cumWeights[last];
  const x = r() * total;
  lo = 0;
  hi = last;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (cumWeights[mid] < x) lo = mid + 1;
    else hi = mid;
  }
  return buyers[lo];
}

/* ───────────── Orders ───────────── */

const HOUR_W = [3.2, 2, 1.2, 0.7, 0.5, 0.5, 0.7, 1.1, 1.6, 2.2, 2.8, 3.3, 3.8, 4.2, 4.6, 5, 5.6, 6.2, 6.9, 7.5, 7.9, 7.6, 6.4, 4.8];
const METHODS: PaymentMethod[] = ["sbp", "card", "sberpay", "tpay", "yoomoney", "mobile"];
const METHOD_W = [52, 23, 9, 7, 4, 5];
const BANKS = ["Т-Банк", "Сбербанк", "ВТБ", "Альфа-Банк", "Озон Банк", "Газпромбанк", "Райффайзен", "Совкомбанк"];
export { BANKS };

const sellable = PRODUCT_SEEDS.filter((p) => p.kind !== "pool");

function productWeightsAt(t: number): number[] {
  const d = Math.floor((NOW_MS - t) / DAY);
  const halloween = t >= Date.UTC(2026, 9, 29, 9) && t <= Date.UTC(2026, 10, 1, 21);
  return sellable.map((p) => {
    if (p.id === "p-kit-halloween") return halloween ? 7 : 0;
    if (p.status !== "active") return 0;
    if (d > p.createdDaysAgo) return 0;
    return p.weight;
  });
}

const PROMO_WINDOWS: Record<string, [number, number]> = {
  WINTER25: [Date.UTC(2026, 10, 1), NOW_MS],
  START10: [0, NOW_MS],
  ARCTIC100: [0, NOW_MS],
  HELLO10: [Date.UTC(2026, 9, 1), NOW_MS],
  KEYS15: [Date.UTC(2026, 9, 10), NOW_MS],
  HALLOWEEN: [Date.UTC(2026, 9, 29), Date.UTC(2026, 10, 1, 21)],
  VKGROUP: [0, NOW_MS],
};

interface Draft {
  t: number;
  player: PlayerDraft;
  items: OrderItem[];
  amount: number;
  method: PaymentMethod;
  serverId: string;
  promoCode?: string;
  creatorCode?: string;
  campaignId?: string;
  giftTo?: string;
}

const drafts2: Draft[] = [];

function priceItem(seed: (typeof PRODUCT_SEEDS)[number]): OrderItem {
  const [qMin, qMax] = seed.qty ?? [1, 1];
  const qty = qMax > qMin ? weighted(Array.from({ length: qMax - qMin + 1 }, (_, i) => qMin + i), Array.from({ length: qMax - qMin + 1 }, (_, i) => 1 / (i + 1))) : qMin;
  return { productId: seed.id, name: seed.name, qty, price: seed.price };
}

function serverFor(seed: (typeof PRODUCT_SEEDS)[number], home: string) {
  if (seed.serverIds.length === 1) return seed.serverIds[0];
  return seed.serverIds.includes(home) ? home : seed.serverIds[0];
}

export const ORDER_LOG_DAYS = 90;

for (let d = ORDER_LOG_DAYS - 1; d >= 0; d--) {
  const dayStart = mskDayStart(d);
  const dow = new Date(dayStart + 3 * HOUR).getUTCDay(); // 0 = Sun (MSK)
  const growth = 40 + (30 * (ORDER_LOG_DAYS - 1 - d)) / (ORDER_LOG_DAYS - 1);
  const weekend = dow === 0 || dow === 6 ? 1.22 : dow === 5 ? 1.08 : 1;
  const date = new Date(dayStart + 3 * HOUR); // MSK wall-clock date
  const md = (date.getUTCMonth() + 1) * 100 + date.getUTCDate();
  const event = md >= 1029 && md <= 1101 ? 1.45 : md === 1104 ? 1.35 : md === 1105 || md === 1106 ? 1.08 : 1;
  const noise = 0.88 + r() * 0.24;
  let count = Math.round(growth * weekend * event * noise);
  const hourLimit = d === 0 ? 12 : 24;
  if (d === 0) {
    const share = HOUR_W.slice(0, 12).reduce((a, b) => a + b, 0) / HOUR_W.reduce((a, b) => a + b, 0);
    count = Math.round(count * share);
  }
  for (let k = 0; k < count; k++) {
    const hour = weightedIndex(HOUR_W.slice(0, hourLimit));
    let t = dayStart + hour * HOUR + int(0, 59) * MINUTE + int(0, 59) * 1000;
    if (t >= NOW_MS - 2000) t = NOW_MS - int(3, 40) * MINUTE;
    const player = pickBuyer(t);
    const seed = weighted(sellable, productWeightsAt(t));
    const items = [priceItem(seed)];
    if (r() < 0.09) {
      const extraPool = sellable.filter((p) => p.id !== seed.id && (p.kind === "case" || p.kind === "cosmetic" || p.kind === "currency") && p.status === "active");
      const extra = extraPool[int(0, extraPool.length - 1)];
      items.push(priceItem(extra));
    }
    let amount = items.reduce((acc, it) => acc + it.price * it.qty, 0);

    let promoCode: string | undefined;
    let creatorCode: string | undefined;
    let campaignId: string | undefined;
    const roll = r();
    if (roll < 0.08) {
      const options = PROMO_SEEDS.filter((p) => {
        const w = PROMO_WINDOWS[p.code];
        return w && t >= w[0] && t <= w[1];
      });
      if (options.length) {
        const promo = options[int(0, options.length - 1)];
        if (!promo.minAmount || amount >= promo.minAmount) {
          promoCode = promo.code;
          amount = promo.kind === "percent" ? Math.round(amount * (1 - promo.value / 100)) : Math.max(1, amount - promo.value);
        }
      }
    } else if (roll < 0.18) {
      const options = CREATOR_SEEDS.filter((c) => c.status === "active" && t >= new Date(c.joinedAt).getTime());
      if (options.length) {
        const c = weighted(options, options.map((o) => Math.sqrt(o.followers)));
        creatorCode = c.code;
        amount = Math.round(amount * 0.95);
      }
    } else if (roll < 0.215) {
      const active = CAMPAIGNS.filter((c) => c.status !== "draft" && c.offer && t >= new Date(c.createdAt).getTime());
      if (active.length) {
        const c = active[int(0, active.length - 1)];
        campaignId = c.id;
        if (c.offer && c.offer.discountPct > 0) amount = Math.round(amount * (1 - c.offer.discountPct / 100));
      }
    }

    const draft: Draft = {
      t,
      player,
      items,
      amount,
      method: weighted(METHODS, METHOD_W),
      serverId: serverFor(seed, player.home),
      promoCode,
      creatorCode,
      campaignId,
    };
    if (r() < 0.015) {
      const friend = drafts[int(0, drafts.length - 1)];
      if (friend.id !== player.id) draft.giftTo = friend.name;
    }
    drafts2.push(draft);
  }
}

// Pool (складчина) contributions — must add up to the pool state in the catalog
for (const seed of PRODUCT_SEEDS.filter((p) => p.kind === "pool")) {
  if (!seed.pool) continue;
  const n = seed.pool.contributors;
  let left = seed.pool.raised;
  const start = NOW_MS - seed.createdDaysAgo * DAY;
  for (let i = 0; i < n; i++) {
    const remaining = n - i;
    const avg = left / remaining;
    let part = i === n - 1 ? left : Math.max(50, Math.round((avg * (0.5 + r())) / 10) * 10);
    if (part > left - (remaining - 1) * 50) part = left - (remaining - 1) * 50;
    left -= part;
    const t = start + Math.floor(((NOW_MS - start - 30 * MINUTE) * (i + r() * 0.8)) / n);
    const player = pickBuyer(t);
    drafts2.push({
      t,
      player,
      items: [{ productId: seed.id, name: seed.name, qty: 1, price: part }],
      amount: part,
      method: weighted(METHODS, METHOD_W),
      serverId: seed.serverIds[0],
    });
  }
}

drafts2.sort((a, b) => a.t - b.t);

const FEE_RATE = PLAN_FEES.pro;

function riskFor(flags: PlayerFlag[]) {
  if (flags.includes("network_blacklist")) return int(88, 97);
  if (flags.includes("chargeback")) return int(70, 86);
  if (flags.includes("many_cards")) return int(52, 66);
  if (flags.includes("vpn")) return int(38, 49);
  if (flags.includes("minor_suspect")) return int(24, 34);
  return Math.round(2 + Math.pow(r(), 2) * 16);
}

// flagged players (decided up front so risk can be applied to their orders)
const flagMap = new Map<string, PlayerFlag[]>();
{
  const heavy = buyers.filter((b) => b.weight > 3 && b.name !== "kotik228" && b.name !== "Steve_Pro");
  const pickFlagged = (n: number, flag: PlayerFlag) => {
    for (let i = 0; i < n; i++) {
      const p = heavy[int(0, heavy.length - 1)];
      flagMap.set(p.id, [...(flagMap.get(p.id) ?? []), flag]);
    }
  };
  pickFlagged(3, "chargeback");
  pickFlagged(1, "vpn");
  pickFlagged(1, "many_cards");
  pickFlagged(2, "minor_suspect");
  // network blacklist — players who only attempted fraudulent payments (no orders)
  const nonBuyers = drafts.filter((d) => !d.buyer);
  flagMap.set(nonBuyers[3].id, ["network_blacklist"]);
  flagMap.set(nonBuyers[11].id, ["network_blacklist", "many_cards"]);
}

function receiptNo(seq: number) {
  return `20${(seq * 7919 + 104729).toString(36).slice(-5)}`;
}

export const ORDERS: Order[] = drafts2.map((d, i) => {
  const seq = 100001 + i;
  const flags = flagMap.get(d.player.id) ?? [];
  const fee = Math.round(d.amount * (d.method === "mobile" ? MOBILE_FEE : FEE_RATE));
  const age = NOW_MS - d.t;
  let status: OrderStatus = "delivered";
  if (age > 2 * DAY) {
    const x = r();
    if (x < 0.017) status = "refunded";
  }
  const slowServer = d.serverId === "srv-anarchy";
  const delivered = status === "delivered" || status === "refunded";
  const waitedOffline = delivered && r() < 0.04;
  const deliveryMs = waitedOffline
    ? int(4, 900) * MINUTE + int(0, 59) * 1000
    : slowServer
      ? int(620, 2400)
      : Math.round(180 + Math.pow(r(), 2.2) * 720);
  return {
    id: `PMC-${seq}`,
    projectId: CURRENT_PROJECT_ID,
    playerId: d.player.id,
    playerName: d.player.name,
    items: d.items,
    amount: d.amount,
    fee,
    net: d.amount - fee,
    method: d.method,
    status,
    createdAt: new Date(d.t).toISOString(),
    deliveredAt: delivered ? new Date(d.t + deliveryMs).toISOString() : undefined,
    deliveryMs: delivered ? deliveryMs : undefined,
    serverId: d.serverId,
    country: d.player.country,
    promoCode: d.promoCode,
    creatorCode: d.creatorCode,
    campaignId: d.campaignId,
    giftTo: d.giftTo,
    risk: riskFor(flags),
    receipt: { status: "sent", number: receiptNo(seq) },
    trace: [],
  };
});

/* ── post-processing: make the recent past tell a story ── */
{
  const recent = (o: Order, ms: number) => NOW_MS - new Date(o.createdAt).getTime() < ms;
  const asPending = (o: Order, status: OrderStatus) => {
    o.status = status;
    o.deliveredAt = undefined;
    o.deliveryMs = undefined;
  };
  const setItem = (o: Order, productId: string) => {
    const seed = PRODUCT_SEEDS.find((p) => p.id === productId)!;
    o.items = [{ productId: seed.id, name: seed.name, qty: 1, price: seed.price }];
    o.amount = seed.price;
    o.fee = Math.round(o.amount * (o.method === "mobile" ? MOBILE_FEE : FEE_RATE));
    o.net = o.amount - o.fee;
    o.promoCode = undefined;
    o.creatorCode = undefined;
    o.campaignId = undefined;
  };
  const candidates = ORDERS.filter((o) => recent(o, 8 * HOUR) && o.status === "delivered").reverse(); // newest first
  const taken = new Set<string>();
  const take = (n: number, pred: (o: Order) => boolean) => {
    const out: Order[] = [];
    for (const o of candidates) {
      if (out.length >= n) break;
      if (taken.has(o.id) || !pred(o)) continue;
      taken.add(o.id);
      out.push(o);
    }
    return out;
  };
  taken.add(ORDERS[ORDERS.length - 1].id); // reserved for "delivering"

  // SkyBlock went offline 47 minutes ago — orders since then wait in its queue
  const skyProducts = ["p-case-ice", "p-coins-1k", "p-case-aurora"];
  take(3, (o) => recent(o, 47 * MINUTE)).forEach((o, i) => {
    o.serverId = "srv-skyblock";
    setItem(o, skyProducts[i % skyProducts.length]);
    asPending(o, "retrying");
  });
  // Anarchy lags: two fresh timeouts are being retried right now (attempt 3 of 5),
  // and two older orders hit a missing plugin
  take(2, (o) => recent(o, 3 * HOUR)).forEach((o, i) => {
    o.serverId = "srv-anarchy";
    o.createdAt = new Date(NOW_MS - (i === 0 ? 4 * MINUTE + 20_000 : 7 * MINUTE + 50_000)).toISOString();
    asPending(o, "retrying");
  });
  take(2, (o) => recent(o, 7 * HOUR) && !recent(o, 3 * HOUR)).forEach((o) => {
    o.serverId = "srv-anarchy";
    setItem(o, "p-coins-1k");
    asPending(o, "failed");
  });
  // kits need the player online — some recent buyers already left the server
  take(4, () => true).forEach((o, i) => {
    o.serverId = "srv-survival";
    setItem(o, i % 2 ? "p-kit-builder" : "p-kit-start");
    asPending(o, "awaiting_player");
  });
  // the very latest order is being delivered right now
  const last = ORDERS[ORDERS.length - 1];
  last.createdAt = new Date(NOW_MS - 1400).toISOString();
  last.serverId = "srv-survival";
  asPending(last, "delivering");

  // keep the log chronological after re-timing and renumber ids accordingly
  ORDERS.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  ORDERS.forEach((o, i) => {
    o.id = `PMC-${100001 + i}`;
  });

  // queue length on servers = commands waiting there
  for (const s of SERVERS) {
    if (s.projectId !== CURRENT_PROJECT_ID) continue;
    const waiting = ORDERS.filter((o) => o.serverId === s.id && (o.status === "retrying" || o.status === "awaiting_player"));
    s.queue = waiting.reduce((acc, o) => acc + o.items.reduce((a, it) => a + (PRODUCT_SEEDS.find((p) => p.id === it.productId)?.commands.length ?? 1), 0), 0);
  }
  // receipts for the last minutes are still being registered
  ORDERS.slice(-3).forEach((o) => (o.receipt = { status: "pending" }));
  // chargebacks — card payments of flagged players, older than a week
  const cbPlayers = [...flagMap.entries()].filter(([, f]) => f.includes("chargeback")).map(([id]) => id);
  for (const pid of cbPlayers) {
    const candidate = ORDERS.find((o) => o.playerId === pid && NOW_MS - new Date(o.createdAt).getTime() > 7 * DAY && o.status === "delivered" && o.amount >= 249);
    if (candidate) {
      candidate.status = "chargeback";
      candidate.method = "card";
    }
  }
}

export const ORDER_INDEX = new Map(ORDERS.map((o) => [o.id, o]));

/* ───────────── Product stats ───────────── */

const PAID: OrderStatus[] = ["delivered", "delivering", "awaiting_player", "retrying", "failed"];
export const isPaid = (o: Order) => PAID.includes(o.status);

export const PRODUCTS: Product[] = PRODUCT_SEEDS.map((seed, idx) => {
  const since30 = mskDayStart(29); // same calendar window as getKpis(30)
  const todayStart = mskDayStart(0);
  let sales30d = 0;
  let revenue30d = 0;
  const trend = Array.from({ length: 14 }, () => 0);
  for (const o of ORDERS) {
    const t = new Date(o.createdAt).getTime();
    if (t < since30 || !isPaid(o)) continue;
    for (const it of o.items) {
      if (it.productId !== seed.id) continue;
      sales30d += it.qty;
      revenue30d += Math.round(it.price * it.qty * (o.amount / o.items.reduce((a, b) => a + b.price * b.qty, 0)));
      const dAgo = Math.floor((todayStart + DAY - 1 - t) / DAY);
      if (dAgo < 14) trend[13 - dAgo] += it.qty;
    }
  }
  // pool progress comes from the actual contributions, not from the seed
  let pool = seed.pool;
  if (pool) {
    const contributions = ORDERS.filter((o) => isPaid(o) && o.items.some((it) => it.productId === seed.id));
    pool = {
      ...pool,
      raised: contributions.reduce((a, o) => a + o.amount, 0),
      contributors: new Set(contributions.map((o) => o.playerId)).size,
    };
  }
  const conv = 0.025 + ((idx * 37) % 70) / 1000; // 2.5–9.5 %
  const { weight, qty, createdDaysAgo, ...rest } = seed;
  void weight;
  void qty;
  return {
    ...rest,
    projectId: CURRENT_PROJECT_ID,
    views30d: sales30d ? Math.round(sales30d / conv) : seed.status === "draft" ? 0 : int(40, 300),
    sales30d,
    revenue30d,
    salesTrend: trend,
    pool,
    createdAt: new Date(NOW_MS - createdDaysAgo * DAY).toISOString(),
    sort: idx,
  };
});

export const PRODUCT_INDEX = new Map(PRODUCTS.map((p) => [p.id, p]));

/* ───────────── Promo codes & creators ───────────── */

export const PROMO_CODES: PromoCode[] = PROMO_SEEDS.map((p) => {
  const used = ORDERS.filter((o) => o.promoCode === p.code && isPaid(o));
  return { ...p, uses: used.length, revenue: used.reduce((a, o) => a + o.amount, 0) };
});

export const CREATORS: Creator[] = CREATOR_SEEDS.map((c) => {
  const orders = ORDERS.filter((o) => o.creatorCode === c.code && isPaid(o));
  const revenue = orders.reduce((a, o) => a + o.amount, 0);
  const recent = orders.filter((o) => NOW_MS - new Date(o.createdAt).getTime() < 14 * DAY).reduce((a, o) => a + o.amount, 0);
  const trend = Array.from({ length: 30 }, () => 0);
  for (const o of orders) {
    const dAgo = Math.floor((NOW_MS - new Date(o.createdAt).getTime()) / DAY);
    if (dAgo < 30) trend[29 - dAgo] += o.amount;
  }
  return {
    ...c,
    buyers: new Set(orders.map((o) => o.playerId)).size,
    revenue,
    owed: Math.round((recent * c.sharePct) / 100),
    paidOut: Math.round(((revenue - recent) * c.sharePct) / 100),
    trend,
  };
});

/* ───────────── Players ───────────── */

const RANK_IDS = new Set(PRODUCT_SEEDS.filter((p) => p.kind === "rank" || p.kind === "subscription").map((p) => p.id));

const ordersByPlayer = new Map<string, Order[]>();
for (const o of ORDERS) {
  const list = ordersByPlayer.get(o.playerId);
  if (list) list.push(o);
  else ordersByPlayer.set(o.playerId, [o]);
}
export { ordersByPlayer };

const ONLINE_SERVERS = ["srv-survival", "srv-anarchy", "srv-lobby"];

export const PLAYERS: Player[] = drafts.map((d) => {
  const orders = ordersByPlayer.get(d.id) ?? [];
  const paid = orders.filter(isPaid);
  const ltv = paid.reduce((a, o) => a + o.amount, 0);
  const lastOrder = orders[orders.length - 1];
  const lastOrderAt = lastOrder ? new Date(lastOrder.createdAt).getTime() : undefined;

  // last seen: buyers are usually seen after their last order
  const activity = r();
  let lastSeen: number;
  if (lastOrderAt && NOW_MS - lastOrderAt < 2 * DAY) lastSeen = Math.min(NOW_MS, lastOrderAt + int(1, 180) * MINUTE);
  else if (activity < 0.16) lastSeen = NOW_MS - int(0, 50) * MINUTE;
  else if (activity < 0.62) lastSeen = NOW_MS - int(1, 13) * DAY - int(0, 23) * HOUR;
  else if (activity < 0.82) lastSeen = NOW_MS - int(14, 45) * DAY;
  else lastSeen = NOW_MS - int(46, 120) * DAY;
  lastSeen = Math.max(lastSeen, d.firstSeen + HOUR, lastOrderAt ?? 0);
  lastSeen = Math.min(lastSeen, NOW_MS);
  const homeOnline = d.home !== "srv-skyblock";
  const online = homeOnline && NOW_MS - lastSeen < 12 * MINUTE;

  const tenureDays = Math.max(1, (lastSeen - d.firstSeen) / DAY);
  const playtimeMin = Math.round(tenureDays * d.intensity * 60 * (0.35 + r() * 0.4));

  const flags = flagMap.get(d.id) ?? [];
  const sinceSeen = NOW_MS - lastSeen;
  const isNew = NOW_MS - d.firstSeen < 14 * DAY;
  let segment: PlayerSegment;
  if (ltv >= 5000) segment = "whale";
  else if (sinceSeen > 45 * DAY) segment = "dormant";
  else if (sinceSeen > 14 * DAY && paid.length > 0) segment = "at_risk";
  else if (isNew) segment = "new";
  else segment = "loyal";

  const catCount = new Map<string, number>();
  for (const o of paid)
    for (const it of o.items) {
      const cat = PRODUCT_INDEX.get(it.productId)?.category ?? "—";
      catCount.set(cat, (catCount.get(cat) ?? 0) + it.qty);
    }
  const favoriteCategory = [...catCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

  // active ranks from rank purchases
  const activeRanks: Player["activeRanks"] = [];
  for (const o of paid) {
    for (const it of o.items) {
      if (!RANK_IDS.has(it.productId)) continue;
      const prod = PRODUCT_INDEX.get(it.productId)!;
      const start = new Date(o.createdAt).getTime();
      const exp = prod.durationDays == null ? null : start + prod.durationDays * DAY;
      if (exp === null || exp > NOW_MS) {
        const existing = activeRanks.findIndex((a) => a.name === prod.name);
        const entry = { name: prod.name, expiresAt: exp === null ? null : new Date(exp).toISOString() };
        if (existing >= 0) activeRanks[existing] = entry;
        else activeRanks.push(entry);
      }
    }
  }

  // monthly spend Jun..Nov
  const months = [5, 6, 7, 8, 9, 10];
  const spendHistory = months.map((m) => {
    const fromOrders = paid.filter((o) => new Date(new Date(o.createdAt).getTime() + 3 * HOUR).getUTCMonth() === m).reduce((a, o) => a + o.amount, 0);
    return fromOrders; // months before the order log starts stay empty — no invented history
  });

  return {
    id: d.id,
    name: d.name,
    externalId: d.externalId,
    country: d.country,
    firstSeenAt: new Date(d.firstSeen).toISOString(),
    lastSeenAt: new Date(lastSeen).toISOString(),
    online,
    serverId: online ? (ONLINE_SERVERS.includes(d.home) ? d.home : "srv-lobby") : undefined,
    playtimeMin,
    ltv,
    orders: orders.length,
    avgCheck: paid.length ? Math.round(ltv / paid.length) : 0,
    lastOrderAt: lastOrderAt ? new Date(lastOrderAt).toISOString() : undefined,
    segment,
    risk: flags.length ? riskFor(flags) : Math.round(2 + Math.pow(r(), 2) * 14),
    flags,
    discord: r() < 0.08 ? `${d.name.toLowerCase()}` : undefined,
    telegram: r() < 0.31 ? `@${d.name.toLowerCase().replace(/[^a-z0-9_]/g, "")}` : undefined,
    favoriteCategory,
    spendHistory,
    activeRanks,
  };
});

export const PLAYER_INDEX = new Map(PLAYERS.map((p) => [p.id, p]));
export const PLAYER_BY_NAME = new Map(PLAYERS.map((p) => [p.name.toLowerCase(), p]));
