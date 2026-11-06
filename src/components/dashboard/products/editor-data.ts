import "server-only";
import { CURRENT_PROJECT_ID, DAY, HOUR, NOW_MS, PROJECTS, SERVERS, getOrdersByProduct, getServer, mskDayStart } from "@/lib/mock";
import type { Product, ProductKind } from "@/lib/mock/types";
import { GAMES } from "@/lib/games";
import { PLAN_FEES, PLAN_META } from "@/lib/payments";
import { formatDateShort, formatTime } from "@/lib/format";
import type { EditorContext, EditorProduct, EditorServer, ProductStatsData } from "./types";

/** yyyy-mm-dd in Moscow time — value for <input type="date"> */
export function mskDateInput(ms: number) {
  return new Date(ms + 3 * HOUR).toISOString().slice(0, 10);
}

export function editorServers(): EditorServer[] {
  return SERVERS.filter((s) => s.projectId === CURRENT_PROJECT_ID).map((s) => ({
    id: s.id,
    name: s.name,
    status: s.status,
    platform: s.platform,
    latencyMs: s.latencyMs,
    agentVersion: s.agentVersion,
    online: s.online,
    maxOnline: s.maxOnline,
    tps: s.tps,
    queue: s.queue,
    offlineSince: s.status === "offline" ? formatTime(s.lastSeenAt) : undefined,
  }));
}

export function editorContext(): EditorContext {
  const project = PROJECTS.find((p) => p.id === CURRENT_PROJECT_ID)!;
  const game = GAMES[project.game];
  return {
    game: project.game,
    gameName: game.name,
    gameRules: game.rules,
    projectName: project.name,
    chatPrefix: `[${project.name}]`,
    feeRate: PLAN_FEES[project.plan],
    feeLabel: PLAN_META[project.plan].rate,
    now: NOW_MS,
  };
}

export function toEditorProduct(p: Product): EditorProduct {
  const minFromPerks = Number(p.perks?.join(" ").match(/Взнос от (\d+)/)?.[1] ?? 50);
  return {
    id: p.id,
    name: p.name,
    kind: p.kind,
    description: p.description,
    perks: p.perks ?? [],
    price: p.price,
    oldPrice: p.oldPrice,
    durationDays: p.durationDays,
    stock: p.stock ?? null,
    commands: p.commands,
    serverIds: p.serverIds,
    status: p.status,
    badge: p.badge,
    tint: p.tint,
    glyph: p.glyph,
    pool: p.pool
      ? {
          target: p.pool.target,
          raised: p.pool.raised,
          contributors: p.pool.contributors,
          deadline: mskDateInput(new Date(p.pool.endsAt).getTime()),
          minContribution: minFromPerks,
          refundIfFailed: /возв/i.test(`${p.description} ${p.perks?.join(" ") ?? ""}`),
        }
      : undefined,
  };
}

export function blankProduct(kind: ProductKind, serverIds: string[]): EditorProduct {
  const oneOff = kind === "currency" || kind === "case" || kind === "unban" || kind === "kit" || kind === "pool";
  return {
    id: null,
    name: "",
    kind,
    description: "",
    perks: [],
    price: 0,
    durationDays: oneOff ? undefined : kind === "cosmetic" ? null : 30,
    stock: null,
    commands: [],
    serverIds,
    status: "draft",
    tint: 0,
    glyph: "?",
    pool:
      kind === "pool"
        ? { target: 3000, raised: 0, contributors: 0, deadline: mskDateInput(NOW_MS + 7 * DAY), minContribution: 50, refundIfFailed: true }
        : undefined,
  };
}

export function productStats(p: Product): ProductStatsData {
  const trend = p.salesTrend.map((value, i) => ({ label: formatDateShort(mskDayStart(p.salesTrend.length - 1 - i)), value }));
  const recent = getOrdersByProduct(p.id, 10).map((o) => ({
    id: o.id,
    playerName: o.playerName,
    amount: o.amount,
    qty: o.items.find((it) => it.productId === p.id)?.qty ?? 1,
    status: o.status,
    createdAt: o.createdAt,
    method: o.method,
    serverName: getServer(o.serverId)?.name ?? "—",
  }));
  return { sales30d: p.sales30d, revenue30d: p.revenue30d, views30d: p.views30d, trend, recent };
}

export const defaultDeadline = () => mskDateInput(NOW_MS + 7 * DAY);
