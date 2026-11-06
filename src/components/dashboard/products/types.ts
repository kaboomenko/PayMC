import type { DeliveryCommand, EulaLevel, GameId, Product, ProductKind, ServerStatus } from "@/lib/mock/types";

/** Slim, serializable product row for the catalog (no commands/description). */
export interface CatalogProduct {
  id: string;
  name: string;
  kind: ProductKind;
  category: string;
  price: number;
  oldPrice?: number;
  durationDays?: number | null;
  status: Product["status"];
  badge?: Product["badge"];
  views30d: number;
  sales30d: number;
  revenue30d: number;
  salesTrend: number[];
  eula: { level: EulaLevel; note?: string };
  pool?: { target: number; raised: number; contributors: number; endsAt: string };
  tint: number;
  glyph: string;
  commandCount: number;
  serverCount: number;
}

export type CatalogStatusFilter = "all" | Product["status"];
export type CatalogEulaFilter = "all" | "risk" | "warn";

export interface CatalogFilters {
  cat: ProductKind | "all";
  status: CatalogStatusFilter;
  q: string;
  eula: CatalogEulaFilter;
}

/** Server option for the editor: checkbox list, per-command target, dry-run target. */
export interface EditorServer {
  id: string;
  name: string;
  status: ServerStatus;
  platform: string;
  latencyMs: number;
  agentVersion: string;
  online: number;
  maxOnline: number;
  tps?: number;
  queue: number;
  /** "11:13" — for offline servers */
  offlineSince?: string;
}

export interface EditorPool {
  target: number;
  raised: number;
  contributors: number;
  /** yyyy-mm-dd (MSK) for the date input */
  deadline: string;
  minContribution: number;
  refundIfFailed: boolean;
}

export interface EditorProduct {
  id: string | null;
  /** set for an unsaved duplicate — the product it was copied from */
  copyOf?: { id: string; name: string };
  name: string;
  kind: ProductKind;
  description: string;
  perks: string[];
  price: number;
  oldPrice?: number;
  durationDays: number | null | undefined;
  stock: number | null;
  commands: DeliveryCommand[];
  serverIds: string[];
  status: Product["status"];
  badge?: Product["badge"];
  tint: number;
  glyph: string;
  pool?: EditorPool;
}

export interface ProductStatsData {
  sales30d: number;
  revenue30d: number;
  views30d: number;
  trend: { label: string; value: number }[];
  recent: {
    id: string;
    playerName: string;
    amount: number;
    qty: number;
    status: import("@/lib/mock/types").OrderStatus;
    createdAt: string;
    method: import("@/lib/mock/types").PaymentMethod;
    serverName: string;
  }[];
}

export interface EditorContext {
  game: GameId;
  gameName: string;
  gameRules?: string;
  projectName: string;
  chatPrefix: string;
  feeRate: number;
  feeLabel: string;
  /** NOW in ms — for expiry previews */
  now: number;
}
