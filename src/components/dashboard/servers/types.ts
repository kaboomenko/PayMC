import type { GameServer } from "@/lib/mock/types";

export type UptimeDay = "ok" | "warn" | "bad";

/** A project server plus derived health series — everything the list and the sheet need. */
export interface ServerView extends GameServer {
  /** 30 days, oldest first */
  uptimeDays: UptimeDay[];
  /** 24 hourly samples, oldest first */
  tpsHistory: number[];
  latencyHistory: number[];
  outdated: boolean;
  /** "11:13" for offline servers */
  offlineSince?: string;
  offlineMinutes?: number;
}

export interface QueueItem {
  id: string;
  orderId: string;
  playerName: string;
  productName: string;
  command: string;
  reason: "server_offline" | "retrying" | "awaiting_player";
  createdAt: string;
  attempt?: number;
}

export interface JournalItem {
  id: string;
  orderId: string;
  playerName: string;
  at: string;
  command: string;
  output: string;
  ms?: number;
  ok: boolean;
}

export interface Incident {
  serverId: string;
  serverName: string;
  since: string;
  minutes: number;
  queued: number;
  orders: number;
}

export const LATEST_AGENT = "2.4.1";
