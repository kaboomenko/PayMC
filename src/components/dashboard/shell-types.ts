import type { ActivityEvent, GameId, Plan } from "@/lib/mock/types";

export interface ShellProject {
  id: string;
  name: string;
  game: GameId;
  gameName: string;
  plan: Plan;
  planLabel: string;
  storefrontUrl: string;
}

export interface ShellData {
  projects: ShellProject[];
  currentProjectId: string;
  /** orders needing attention (failed / retrying / awaiting player) */
  issues: number;
  offlineServers: number;
  notifications: ActivityEvent[];
  goal?: { title: string; target: number; raised: number };
  /** sales in the last 60 minutes — "live" pill in the top bar */
  salesLastHour: number;
  user: { name: string; email: string };
  /** quick-search entries for the command palette */
  search: { id: string; label: string; sub: string; href: string; kind: "order" | "player" | "product" }[];
}
