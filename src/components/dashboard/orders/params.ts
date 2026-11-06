/**
 * URL state of the orders page. Pure functions — shared by the server page
 * (parsing awaited searchParams) and the client filter bar (building hrefs).
 */
import type { OrderStatus, PaymentMethod } from "@/lib/mock/types";

export const ORDERS_PATH = "/dashboard/orders";
export const ORDERS_PAGE_SIZE = 30;

export const ORDER_VIEWS = ["all", "issues", "awaiting", "disputes", "large"] as const;
export type OrderView = (typeof ORDER_VIEWS)[number];

export const ORDER_VIEW_LABELS: Record<OrderView, string> = {
  all: "Все",
  issues: "Требуют внимания",
  awaiting: "Ждут входа",
  disputes: "Возвраты и споры",
  large: "Крупные",
};

export const ORDER_PERIODS = ["1", "7", "30", "90"] as const;
export type OrderPeriod = (typeof ORDER_PERIODS)[number];

export const ORDER_PERIOD_LABELS: Record<OrderPeriod, string> = {
  "1": "24 ч",
  "7": "7 дн",
  "30": "30 дн",
  "90": "90 дн",
};

export const ORDER_STATUSES: OrderStatus[] = [
  "delivered",
  "delivering",
  "awaiting_player",
  "retrying",
  "failed",
  "refunded",
  "chargeback",
];

/** Orders of this amount and above land in the «Крупные» view */
export const LARGE_ORDER_RUB = 1000;

export interface OrdersQuery {
  q: string;
  status: OrderStatus | "all";
  method: PaymentMethod | "all";
  server: string;
  days: OrderPeriod;
  view: OrderView;
  page: number;
  id?: string;
  /** exact creator code, ?creator=FROST — links from the creators page */
  creator?: string;
  /** exact promo code, ?promo=WINTER25 — links from the promo page */
  promo?: string;
}

export const DEFAULT_ORDERS_QUERY: OrdersQuery = {
  q: "",
  status: "all",
  method: "all",
  server: "all",
  days: "30",
  view: "all",
  page: 1,
};

type RawParams = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Promo and creator codes: latin letters, digits, «_» and «-», compared exactly (upper case). */
function parseCode(v: string | string[] | undefined) {
  const code = first(v)?.trim().toUpperCase();
  return code && /^[A-Z0-9_-]{2,32}$/.test(code) ? code : undefined;
}

export function parseOrdersQuery(raw: RawParams, methods: readonly string[], servers: readonly string[]): OrdersQuery {
  const status = first(raw.status);
  const method = first(raw.method);
  const server = first(raw.server);
  const days = first(raw.days);
  const view = first(raw.view);
  const page = Number.parseInt(first(raw.page) ?? "1", 10);
  const id = first(raw.id)?.trim();
  return {
    q: (first(raw.q) ?? "").slice(0, 64),
    status: status && (ORDER_STATUSES as string[]).includes(status) ? (status as OrderStatus) : "all",
    method: method && methods.includes(method) ? (method as PaymentMethod) : "all",
    server: server && servers.includes(server) ? server : "all",
    days: days && (ORDER_PERIODS as readonly string[]).includes(days) ? (days as OrderPeriod) : DEFAULT_ORDERS_QUERY.days,
    view: view && (ORDER_VIEWS as readonly string[]).includes(view) ? (view as OrderView) : "all",
    page: Number.isFinite(page) && page > 0 ? page : 1,
    id: id ? id.toUpperCase() : undefined,
    creator: parseCode(raw.creator),
    promo: parseCode(raw.promo),
  };
}

/** Serialises a query into an href, dropping defaults so URLs stay short. */
export function ordersHref(query: OrdersQuery, patch: Partial<OrdersQuery> = {}): string {
  const next = { ...query, ...patch };
  const sp = new URLSearchParams();
  if (next.view !== "all") sp.set("view", next.view);
  if (next.q.trim()) sp.set("q", next.q.trim());
  if (next.status !== "all") sp.set("status", next.status);
  if (next.method !== "all") sp.set("method", next.method);
  if (next.server !== "all") sp.set("server", next.server);
  if (next.creator) sp.set("creator", next.creator);
  if (next.promo) sp.set("promo", next.promo);
  if (next.days !== DEFAULT_ORDERS_QUERY.days) sp.set("days", next.days);
  if (next.page > 1) sp.set("page", String(next.page));
  if (next.id) sp.set("id", next.id);
  const s = sp.toString();
  return s ? `${ORDERS_PATH}?${s}` : ORDERS_PATH;
}

/** True when any narrowing filter (not view/page/id) is set */
export function hasOrderFilters(q: OrdersQuery) {
  return Boolean(q.q.trim()) || q.status !== "all" || q.method !== "all" || q.server !== "all" || Boolean(q.creator) || Boolean(q.promo);
}

/** Patch that clears every narrowing filter (keeps view and period). */
export const CLEARED_ORDER_FILTERS: Partial<OrdersQuery> = { q: "", status: "all", method: "all", server: "all", creator: undefined, promo: undefined };
