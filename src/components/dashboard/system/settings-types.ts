import type { GameId, MemberRole } from "@/lib/mock/types";

export type SettingsTab = "project" | "team" | "antifraud" | "notifications" | "security" | "import";
export const SETTINGS_TABS: readonly SettingsTab[] = ["project", "team", "antifraud", "notifications", "security", "import"];

export interface ProjectInfo {
  name: string;
  slug: string;
  domain?: string;
  game: GameId;
  createdAt: string;
  games: { id: GameId; name: string }[];
}

export interface TeamRow {
  id: string;
  name: string;
  email: string;
  role: MemberRole;
  splitPct: number;
  lastActiveAt: string;
  twoFactor: boolean;
  invited?: boolean;
}

export interface AuditEntry {
  id: string;
  actor: string;
  action: string;
  target?: string;
  diff?: { before: string; after: string };
  at: string;
  ip: string;
  area: "finance" | "catalog" | "access" | "servers";
}

export interface BlockedPayment {
  id: string;
  player: string;
  amount: number;
  reason: string;
  at: string;
}

export interface ImportProductRow {
  theirs: string;
  theirPrice: number;
  /** suggested PayMC product id or "new" */
  match: string;
}

export interface ImportCommandRow {
  product: string;
  original: string;
  converted: string;
  unknown: string[];
}

export interface ImportData {
  products: ImportProductRow[];
  paymcProducts: { id: string; name: string; price: number }[];
  commands: ImportCommandRow[];
  promos: { code: string; discount: string; uses: number; status: "ok" | "expired" }[];
  buyers: { name: string; rank: string; daysLeft: number | null }[];
  totals: { products: number; commands: number; promos: number; buyers: number; activeRanks: number };
}

export interface SettingsData {
  project: ProjectInfo;
  team: TeamRow[];
  audit: AuditEntry[];
  blocked: BlockedPayment[];
  importData: ImportData;
  now: number;
}
