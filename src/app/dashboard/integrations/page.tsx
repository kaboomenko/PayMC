import type { Metadata } from "next";
import { PageHeader } from "@/components/dashboard/page-header";
import { DAILY, INTEGRATIONS, PAYOUTS, SERVERS, getOrder, getOrders, getPlayer, getServer, mskDayStart } from "@/lib/mock";
import { formatDate } from "@/lib/format";
import { TelegramCard } from "@/components/dashboard/system/telegram-card";
import { IntegrationGroups } from "@/components/dashboard/system/integration-groups";
import { WebhooksPanel } from "@/components/dashboard/system/webhooks-panel";
import { ApiKeysPanel } from "@/components/dashboard/system/api-keys-panel";

export const metadata: Metadata = { title: "Интеграции" };

/** A realistic order.delivered payload built from a real recent order and its trace. */
function buildTestPayload() {
  const recent = getOrders({ status: "delivered", days: 1 }).find((o) => o.items.length === 1 && o.serverId === "srv-survival") ?? getOrders({ status: "delivered" })[0];
  const order = getOrder(recent.id)!;
  const player = getPlayer(order.playerId);
  const server = getServer(order.serverId);
  const trace = order.trace
    .filter((s) => ["payment", "queued", "sent", "executed", "confirmed", "receipt"].includes(s.kind))
    .map((s) => ({
      step: s.kind,
      at: s.at,
      ...(s.deltaMs !== undefined ? { delta_ms: s.deltaMs } : {}),
      ...(s.command ? { command: s.command } : {}),
      ...(s.output ? { output: s.output } : {}),
      ...(!s.command && s.detail ? { detail: s.detail } : {}),
    }));
  const payload = {
    id: `evt_${order.id.replace("PMC-", "")}d41f`,
    type: "order.delivered",
    created_at: order.deliveredAt,
    project: "arctic",
    data: {
      order: {
        id: order.id,
        amount: order.amount,
        currency: "RUB",
        fee: order.fee,
        net: order.net,
        method: order.method,
        items: order.items.map((it) => ({ product_id: it.productId, name: it.name, qty: it.qty, price: it.price })),
        player: { name: order.playerName, uuid: player?.externalId ?? null },
        server: { id: order.serverId, name: server?.name ?? null },
        delivery_ms: order.deliveryMs,
        receipt: order.receipt?.number ?? null,
      },
      trace,
    },
  };
  return { json: JSON.stringify(payload, null, 2), orderId: order.id, deliveryMs: order.deliveryMs ?? 0 };
}

export default function IntegrationsPage() {
  const yesterday = DAILY[DAILY.length - 2];
  const sky = SERVERS.find((s) => s.id === "srv-skyblock");
  const skyQueued = getOrders({ serverId: "srv-skyblock", status: "retrying", days: 1 }).length;
  const lastSale = getOrders({ status: "delivered", days: 1 })[0];
  const todaysPayout = PAYOUTS.find((p) => new Date(p.createdAt).getTime() >= mskDayStart(0));

  const preview = {
    sale: lastSale
      ? { player: lastSale.playerName, item: lastSale.items[0]?.name ?? "", amount: lastSale.amount, ms: lastSale.deliveryMs ?? 300, at: lastSale.createdAt, orderId: lastSale.id }
      : null,
    outage: sky ? { server: sky.name, since: sky.lastSeenAt, queued: skyQueued } : null,
    payout: todaysPayout ? { amount: todaysPayout.amount, at: todaysPayout.createdAt, members: todaysPayout.splits.length } : null,
    digest: { date: formatDate(yesterday.date, { year: false }), at: new Date(new Date(yesterday.date).getTime() + 21 * 3_600_000).toISOString(), revenue: yesterday.revenue, orders: yesterday.orders, buyers: yesterday.buyers },
  };

  const groups = INTEGRATIONS.filter((i) => i.id !== "telegram");
  const telegram = INTEGRATIONS.find((i) => i.id === "telegram");

  return (
    <>
      <PageHeader
        title="Интеграции"
        description="Уведомления, сообщество, аналитика и API. Discord в России заблокирован — основные каналы для команды и игроков Telegram и VK."
      />
      <div className="space-y-8">
        <TelegramCard detail={telegram?.detail ?? ""} preview={preview} />
        <IntegrationGroups items={groups} />
        <WebhooksPanel payload={buildTestPayload()} />
        <ApiKeysPanel />
      </div>
    </>
  );
}
