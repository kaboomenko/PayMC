/** URL state of /dashboard/players — pure, shared by the server page and client toolbar. */
import type { CountryCode, PlayerFlag, PlayerSegment } from "@/lib/mock/types";

export const PLAYERS_PATH = "/dashboard/players";
export const PLAYERS_PAGE_SIZE = 30;

export const PLAYER_SEGMENTS = ["all", "whale", "loyal", "new", "at_risk", "dormant", "flagged"] as const;
export type SegmentFilter = (typeof PLAYER_SEGMENTS)[number];

export const PLAYER_SORTS = ["ltv", "recent", "orders", "risk"] as const;
export type PlayerSort = (typeof PLAYER_SORTS)[number];

export const PLAYER_SORT_LABELS: Record<PlayerSort, string> = {
  ltv: "LTV",
  recent: "Последний визит",
  orders: "Заказы",
  risk: "Риск",
};

export interface PlayersQuery {
  q: string;
  segment: SegmentFilter;
  sort: PlayerSort;
  page: number;
}

export const DEFAULT_PLAYERS_QUERY: PlayersQuery = { q: "", segment: "all", sort: "ltv", page: 1 };

type RawParams = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export function parsePlayersQuery(raw: RawParams): PlayersQuery {
  const segment = first(raw.segment);
  const sort = first(raw.sort);
  const page = Number.parseInt(first(raw.page) ?? "1", 10);
  return {
    q: (first(raw.q) ?? "").slice(0, 64),
    segment: segment && (PLAYER_SEGMENTS as readonly string[]).includes(segment) ? (segment as SegmentFilter) : "all",
    sort: sort && (PLAYER_SORTS as readonly string[]).includes(sort) ? (sort as PlayerSort) : "ltv",
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };
}

export function playersHref(query: PlayersQuery, patch: Partial<PlayersQuery> = {}) {
  const next = { ...query, ...patch };
  const sp = new URLSearchParams();
  if (next.segment !== "all") sp.set("segment", next.segment);
  if (next.q.trim()) sp.set("q", next.q.trim());
  if (next.sort !== "ltv") sp.set("sort", next.sort);
  if (next.page > 1) sp.set("page", String(next.page));
  const s = sp.toString();
  return s ? `${PLAYERS_PATH}?${s}` : PLAYERS_PATH;
}

/** One table row — only what the list needs. */
export interface PlayerRow {
  id: string;
  name: string;
  country: CountryCode;
  online: boolean;
  serverName?: string;
  segment: PlayerSegment;
  ltv: number;
  orders: number;
  avgCheck: number;
  lastSeenAt: string;
  ranks: { name: string; daysLeft: number | null }[];
  risk: number;
  flags: PlayerFlag[];
  telegram?: string;
}

/** Short flag labels for dense cells; full label + hint live in playerFlagMeta. */
export const FLAG_SHORT: Record<PlayerFlag, string> = {
  chargeback: "чарджбэк",
  network_blacklist: "ЧС сети",
  vpn: "VPN",
  many_cards: "4+ карты",
  minor_suspect: "лимит трат",
};
