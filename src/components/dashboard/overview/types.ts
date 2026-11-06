/**
 * Serializable payloads for the overview page. Built on the server in ./data.ts,
 * consumed by small client components — never the raw ORDERS/PLAYERS arrays.
 */
import type { Tone } from "@/lib/mock/meta";
import type { OrderStatus, PaymentMethod, ServerStatus } from "@/lib/mock/types";

export type OverviewPeriod = "7" | "30";

export interface KpiTile {
  id: "revenue" | "orders" | "avgCheck" | "conversion";
  label: string;
  caption: string;
  value: string;
  prev: string;
  /** relative % change, or percentage points for rates */
  delta: number;
  deltaUnit: "pct" | "pp";
  /** extra context line under the value */
  sub?: string;
  spark: number[];
}

export interface RevenuePoint {
  date: string;
  cur: number | null;
  prev: number | null;
  [key: string]: string | number | null;
}

export interface PeriodBundle {
  days: number;
  kpis: KpiTile[];
  series: RevenuePoint[];
  total: number;
  delta: number;
  best: { date: string; revenue: number };
  avgPerDay: number;
}

export interface OverviewPulseData {
  periods: Record<OverviewPeriod, PeriodBundle>;
  today: { gross: number; orders: number; sameTimeLastWeek: number; weekAgo: string };
  novemberForecast: { actual: number; forecast: number };
}

export interface AttentionOrder {
  id: string;
  playerName: string;
  item: string;
  amount: number;
  status: Extract<OrderStatus, "failed" | "retrying">;
  createdAt: string;
}

/** One root cause (missing plugin, server offline, slow agent) with the orders it blocks. */
export interface AttentionGroup {
  id: string;
  tone: "bad" | "warn";
  pulse: boolean;
  server: string;
  title: string;
  detail: string;
  href: string;
  cta: string;
  /** failing command and the server's response */
  console?: { command: string; output: string };
  orders: AttentionOrder[];
}

export interface AttentionData {
  groups: AttentionGroup[];
  awaiting: number;
  orders: number;
}

export interface RecentOrderRow {
  id: string;
  playerName: string;
  items: string;
  amount: number;
  method: string;
  status: OrderStatus;
  statusLabel: string;
  tone: Tone;
  createdAt: string;
  serverName: string;
}

export interface ServerRow {
  id: string;
  name: string;
  platform: string;
  status: ServerStatus;
  online: number;
  maxOnline: number;
  latencyMs: number;
  queue: number;
  tps?: number;
  agentVersion: string;
  onlineHistory: number[];
  /** platform, or what is wrong right now */
  note: string;
}

export interface GoalData {
  title: string;
  shortTitle: string;
  target: number;
  raised: number;
  daysLeft: number;
  perDay: number;
  servers: number;
  lastSupporter: string;
}

export interface MethodSlice {
  key: PaymentMethod;
  label: string;
  amount: number;
  count: number;
  share: number;
  settlement: string;
}

export interface PayoutPreview {
  at: string;
  estimate: number;
  todayGross: number;
  morningShare: number;
  available: number;
  pending: number;
  splits: { id: string; name: string; role: string; pct: number; amount: number; destination: string }[];
}

export interface SetupStep {
  id: string;
  title: string;
  hint: string;
  done: boolean;
}
