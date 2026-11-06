import "server-only";
import { DAY, NOW_MS, PLAYERS, SERVERS, getPlayers } from "@/lib/mock";
import type { Player } from "@/lib/mock/types";
import { PLAYERS_PAGE_SIZE, type PlayerRow, type PlayersQuery, type SegmentFilter } from "./params";

const SERVER_NAME = new Map(SERVERS.map((s) => [s.id, s.name]));

export function daysLeft(expiresAt: string | null) {
  if (!expiresAt) return null;
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - NOW_MS) / DAY));
}

export function toPlayerRow(p: Player): PlayerRow {
  return {
    id: p.id,
    name: p.name,
    country: p.country,
    online: p.online,
    serverName: p.serverId ? SERVER_NAME.get(p.serverId) : undefined,
    segment: p.segment,
    ltv: p.ltv,
    orders: p.orders,
    avgCheck: p.avgCheck,
    lastSeenAt: p.lastSeenAt,
    ranks: p.activeRanks.map((r) => ({ name: r.name, daysLeft: daysLeft(r.expiresAt) })),
    risk: p.risk,
    flags: p.flags,
    telegram: p.telegram,
  };
}

export function queryPlayers(q: PlayersQuery) {
  const searched = getPlayers({ query: q.q || undefined, sort: q.sort });
  const counts: Record<SegmentFilter, number> = { all: 0, whale: 0, loyal: 0, new: 0, at_risk: 0, dormant: 0, flagged: 0 };
  for (const p of searched) {
    counts.all++;
    counts[p.segment]++;
    if (p.flags.length) counts.flagged++;
  }
  const list =
    q.segment === "all" ? searched : q.segment === "flagged" ? searched.filter((p) => p.flags.length) : searched.filter((p) => p.segment === q.segment);
  const pages = Math.max(1, Math.ceil(list.length / PLAYERS_PAGE_SIZE));
  const page = Math.min(q.page, pages);
  const start = (page - 1) * PLAYERS_PAGE_SIZE;

  // segment context for the action bar
  const ltv = list.reduce((a, p) => a + p.ltv, 0);
  const avgAway = list.length ? list.reduce((a, p) => a + (NOW_MS - new Date(p.lastSeenAt).getTime()) / DAY, 0) / list.length : 0;
  const telegram = list.filter((p) => p.telegram).length;
  const totalLtv = PLAYERS.reduce((a, p) => a + p.ltv, 0);

  return {
    rows: list.slice(start, start + PLAYERS_PAGE_SIZE).map(toPlayerRow),
    total: list.length,
    page,
    pages,
    start,
    counts,
    segmentStats: { count: list.length, ltv, ltvShare: totalLtv ? (ltv / totalLtv) * 100 : 0, avgAwayDays: avgAway, telegram },
  };
}
