import "server-only";
import { CAMPAIGNS, CURRENT_PROJECT_ID, PROJECTS, SERVERS, buildTrace, getOrder, getOrders, getProduct, isPaid } from "@/lib/mock";
import { MOBILE_FEE, PLAN_FEES } from "@/lib/payments";
import type { Order, ProductKind } from "@/lib/mock/types";
import { formatDate, formatNumber } from "@/lib/format";
import { LARGE_ORDER_RUB, ORDERS_PAGE_SIZE, type OrderView, type OrdersQuery } from "./params";
import type { OrderDetail, OrderRow, ServerOption } from "./types";

export const PROJECT_SERVERS: ServerOption[] = SERVERS.filter((s) => s.projectId === CURRENT_PROJECT_ID).map((s) => ({
  id: s.id,
  name: s.name,
  status: s.status,
}));

const VIEW_TEST: Record<OrderView, (o: Order) => boolean> = {
  all: () => true,
  issues: (o) => o.status === "failed" || o.status === "retrying",
  awaiting: (o) => o.status === "awaiting_player",
  disputes: (o) => o.status === "refunded" || o.status === "chargeback",
  large: (o) => o.amount >= LARGE_ORDER_RUB,
};

/**
 * Auto-retries of a retrying order, read from its trace so the list and the
 * drawer always show the same count. Only scheduled «Повтор N из M» steps
 * count; the pending one is the next attempt, not a made one.
 */
function retryProgress(o: Order): OrderRow["retry"] {
  if (o.status !== "retrying") return undefined;
  const steps = buildTrace(o).filter((s) => s.kind === "retry" && /^Повтор \d+ из \d+/.test(s.title));
  if (!steps.length) return undefined; // offline server: the job waits in the queue, no attempts yet
  const max = Number(steps[0].title.match(/из (\d+)/)?.[1] ?? 5);
  return { done: steps.filter((s) => s.status !== "pending").length, max };
}

export function toOrderRow(o: Order): OrderRow {
  return {
    retry: retryProgress(o),
    id: o.id,
    playerId: o.playerId,
    playerName: o.playerName,
    items: o.items.map((it) => ({ name: it.name, qty: it.qty })),
    amount: o.amount,
    method: o.method,
    status: o.status,
    createdAt: o.createdAt,
    deliveryMs: o.deliveryMs,
    serverId: o.serverId,
    promoCode: o.promoCode,
    creatorCode: o.creatorCode,
    giftTo: o.giftTo,
    country: o.country,
  };
}

/**
 * Filters on the server: other filters first (search/method/server/period),
 * then the saved view and the status select. View counts ignore the status
 * select — clicking a view resets it, so the count is what you will get.
 */
export function queryOrders(q: OrdersQuery) {
  const base = getOrders({
    query: q.q || undefined,
    method: q.method,
    serverId: q.server,
    days: Number(q.days),
  }).filter((o) => (!q.creator || o.creatorCode === q.creator) && (!q.promo || o.promoCode === q.promo));

  const counts = { all: 0, issues: 0, awaiting: 0, disputes: 0, large: 0 } satisfies Record<OrderView, number>;
  for (const o of base) {
    counts.all++;
    if (VIEW_TEST.issues(o)) counts.issues++;
    if (VIEW_TEST.awaiting(o)) counts.awaiting++;
    if (VIEW_TEST.disputes(o)) counts.disputes++;
    if (VIEW_TEST.large(o)) counts.large++;
  }

  const test = VIEW_TEST[q.view];
  const filtered = base.filter((o) => test(o) && (q.status === "all" || o.status === q.status));
  const pages = Math.max(1, Math.ceil(filtered.length / ORDERS_PAGE_SIZE));
  const page = Math.min(q.page, pages);
  const start = (page - 1) * ORDERS_PAGE_SIZE;
  const slice = filtered.slice(start, start + ORDERS_PAGE_SIZE);
  // money of the list: paid orders and refunded/disputed ones are summed apart,
  // so «оплачено» matches revenue in analytics for the same period
  let paidSum = 0;
  let disputedSum = 0;
  let disputed = 0;
  for (const o of filtered) {
    if (isPaid(o)) paidSum += o.amount;
    else {
      disputedSum += o.amount;
      disputed++;
    }
  }

  return {
    rows: slice.map(toOrderRow),
    total: filtered.length,
    paidSum,
    disputedSum,
    disputed,
    page,
    pages,
    start,
    counts,
  };
}

function chatFor(o: Order): OrderDetail["chat"] {
  const first = o.items[0];
  const product = first ? getProduct(first.productId) : undefined;
  const name = first?.name ?? "покупку";
  const broadcast = `${o.playerName} поддержал сервер и получил ${name} — спасибо!`;
  if (!product) return { broadcast, personal: `Покупка выдана: ${name}.` };
  const deliveredAt = new Date(o.deliveredAt ?? o.createdAt).getTime();
  let personal: string;
  switch (product.kind) {
    case "rank":
    case "subscription":
      personal =
        product.durationDays == null
          ? `Привилегия ${product.name} выдана навсегда. Добро пожаловать в зал славы!`
          : `Привилегия ${product.name} активна до ${formatDate(deliveredAt + product.durationDays * 86_400_000, { year: false })}.`;
      break;
    case "currency":
      personal = `Начислено ${product.name}. Потратить — /shop.`;
      break;
    case "case":
      personal = `Ключи в инвентаре: ${product.name} ×${formatNumber(first.qty)}. Кейсы — на спавне, /warp cases.`;
      break;
    case "kit":
      personal = `${product.name} уже в инвентаре. Освободите 9 слотов, если что-то не влезло.`;
      break;
    case "unban":
      personal = product.id === "p-unmute" ? "Чат снова доступен. Пожалуйста, без капса." : "Бан снят на всех серверах сети. Не попадайтесь снова.";
      break;
    case "cosmetic":
      personal = `${product.name} доступен в меню /cosmetics.`;
      break;
    case "pool":
      personal = `Ваш вклад в «${product.name}» учтён. Спасибо, что скидываетесь вместе!`;
      break;
    default:
      personal = `Покупка выдана: ${product.name}.`;
  }
  return { broadcast, personal };
}

export function getOrderDetail(id: string): OrderDetail | null {
  const o = getOrder(id);
  if (!o) return null;
  const server = SERVERS.find((s) => s.id === o.serverId);
  const kinds = o.items.map((it) => getProduct(it.productId)?.kind).filter(Boolean) as ProductKind[];
  return {
    ...o,
    serverName: server?.name ?? o.serverId,
    serverStatus: server?.status ?? "online",
    campaignName: o.campaignId ? CAMPAIGNS.find((c) => c.id === o.campaignId)?.name : undefined,
    chat: chatFor(o),
    itemKinds: kinds,
    feeRate: o.method === "mobile" ? MOBILE_FEE : PLAN_FEES[PROJECTS.find((p) => p.id === CURRENT_PROJECT_ID)?.plan ?? "pro"],
  };
}
