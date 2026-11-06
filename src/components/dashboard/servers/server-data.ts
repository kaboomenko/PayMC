import "server-only";
import { CURRENT_PROJECT_ID, MINUTE, NOW_MS, SERVERS, getOrder, getOrders, getProduct } from "@/lib/mock";
import type { GameServer } from "@/lib/mock/types";
import { createRng } from "@/lib/utils";
import { formatTime } from "@/lib/format";
import { expandTemplate } from "@/components/dashboard/products/dry-run";
import { LATEST_AGENT, type Incident, type JournalItem, type QueueItem, type ServerView, type UptimeDay } from "./types";

function seedOf(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

function uptimeStrip(s: GameServer): UptimeDay[] {
  const rng = createRng(seedOf(s.id) + 7);
  const days: UptimeDay[] = Array.from({ length: 30 }, () => "ok");
  const incidents = Math.round((100 - s.uptime30d) * 1.6);
  const tone: UptimeDay = s.uptime30d < 98 ? "bad" : "warn";
  for (let i = 0; i < incidents; i++) days[Math.floor(rng() * 28)] = i % 2 ? "warn" : tone;
  if (s.status === "offline") days[29] = "bad";
  else if (s.status === "degraded") days[29] = "warn";
  return days;
}

function series(s: GameServer, base: number, spread: number, salt: number, round: (n: number) => number) {
  const rng = createRng(seedOf(s.id) + salt);
  return Array.from({ length: 24 }, (_, i) => {
    if (s.status === "offline" && i === 23) return 0;
    const dip = s.status === "degraded" && (i === 20 || i === 21) ? spread * 1.8 : 0;
    return round(Math.max(0, base + (rng() - 0.5) * spread - dip));
  });
}

function toView(s: GameServer): ServerView {
  const tpsBase = s.status === "offline" ? 19.6 : (s.tps ?? 20);
  const latBase = s.status === "offline" ? 16 : s.latencyMs;
  return {
    ...s,
    uptimeDays: uptimeStrip(s),
    tpsHistory: series(s, tpsBase, s.status === "degraded" ? 2.4 : 0.5, 11, (n) => Math.min(20, Math.round(n * 10) / 10)),
    latencyHistory: series(s, latBase, Math.max(4, latBase * 0.5), 23, (n) => Math.round(n)).map((v, i, arr) =>
      s.status === "offline" && i === arr.length - 1 ? 0 : v,
    ),
    outdated: s.agentVersion !== LATEST_AGENT,
    offlineSince: s.status === "offline" ? formatTime(s.lastSeenAt) : undefined,
    offlineMinutes: s.status === "offline" ? Math.round((NOW_MS - new Date(s.lastSeenAt).getTime()) / MINUTE) : undefined,
  };
}

/** Commands waiting on a server: from retrying / awaiting orders, oldest first (execution order). */
function buildQueue(s: GameServer): QueueItem[] {
  const orders = [...getOrders({ serverId: s.id, status: "retrying" }), ...getOrders({ serverId: s.id, status: "awaiting_player" })].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  return orders.flatMap((o) =>
    o.items.flatMap((it) => {
      const p = getProduct(it.productId);
      return (p?.commands ?? [])
        .filter((c) => c.serverId === "all" || c.serverId === s.id)
        .map((c, i) => ({
          id: `${o.id}-${it.productId}-${i}`,
          orderId: o.id,
          playerName: o.playerName,
          productName: it.name,
          command: expandTemplate(c.template.replace(" accumulate", ""), { player: o.playerName, days: p?.durationDays, amount: it.qty, custom: o.playerName.slice(0, 6) }),
          reason: s.status === "offline" ? ("server_offline" as const) : o.status === "awaiting_player" ? ("awaiting_player" as const) : ("retrying" as const),
          createdAt: o.createdAt,
          attempt: o.status === "retrying" ? 1 : undefined,
        }));
    }),
  );
}

/** Last 15 executed commands with console output, newest first — built from real order traces. */
function buildJournal(serverId: string): JournalItem[] {
  const out: JournalItem[] = [];
  for (const o of getOrders({ serverId })) {
    if (out.length >= 15) break;
    if (o.status !== "delivered" && o.status !== "failed" && o.status !== "refunded" && o.status !== "chargeback") continue;
    const full = getOrder(o.id);
    if (!full) continue;
    const steps = full.trace.filter((st) => st.command && (st.kind === "executed" || st.kind === "error")).reverse();
    for (const st of steps) {
      out.push({
        id: st.id,
        orderId: o.id,
        playerName: o.playerName,
        at: st.at,
        command: st.command!,
        output: st.output ?? "",
        ms: st.deltaMs,
        ok: st.status !== "error",
      });
    }
  }
  return out.slice(0, 15);
}

export function buildServersData() {
  const list = SERVERS.filter((s) => s.projectId === CURRENT_PROJECT_ID);
  const servers = list.map(toView);
  const queues: Record<string, QueueItem[]> = Object.fromEntries(list.map((s) => [s.id, buildQueue(s)]));
  const journals: Record<string, JournalItem[]> = Object.fromEntries(list.map((s) => [s.id, buildJournal(s.id)]));
  const down = servers.find((s) => s.status === "offline");
  const incident: Incident | null = down
    ? {
        serverId: down.id,
        serverName: down.name,
        since: down.offlineSince ?? "",
        minutes: down.offlineMinutes ?? 0,
        queued: queues[down.id].length,
        orders: new Set(queues[down.id].map((q) => q.orderId)).size,
      }
    : null;
  return { servers, queues, journals, incident };
}
