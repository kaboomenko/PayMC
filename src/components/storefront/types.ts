import type { GameId, Product, ProductKind, ServerStatus } from "@/lib/mock/types";

/**
 * Serializable slice of the project that the public storefront needs.
 * Built on the server (see ./data.ts) and passed to client components —
 * never ship ORDERS / PLAYERS to the browser.
 */
export interface StoreProduct {
  id: string;
  name: string;
  kind: ProductKind;
  category: string;
  description: string;
  perks: string[];
  price: number;
  oldPrice?: number;
  /** null = навсегда, undefined = не срочный товар */
  durationDays?: number | null;
  badge?: Product["badge"];
  tint: number;
  glyph: string;
  pool?: {
    target: number;
    raised: number;
    contributors: number;
    endsAt: string;
    minContribution: number;
    /** a few recent contributor nicks for the avatar stack */
    names: string[];
  };
}

export interface StorePurchase {
  id: string;
  /** used to hide purchases of products the store doesn't show */
  productId: string;
  player: string;
  product: string;
  at: string;
  gift?: boolean;
}

export interface StorePromo {
  code: string;
  kind: "percent" | "fixed";
  value: number;
  minAmount?: number;
  /** "all" or the product ids the code applies to */
  scope: "all" | string[];
  /** wording of a limited scope: "на кейсы" */
  scopeLabel?: string;
  firstPurchaseOnly?: boolean;
}

export interface StoreServer {
  name: string;
  online: number;
  status: ServerStatus;
}

export interface StoreData {
  slug: string;
  name: string;
  game: GameId;
  online: number;
  address: string;
  /** public host of the store: custom domain or {slug}.paymc.ru */
  host: string;
  goal?: { title: string; target: number; raised: number; daysLeft: number };
  recent: StorePurchase[];
  products: StoreProduct[];
  promos: StorePromo[];
  /** lower-cased nicks that already bought here — for first-purchase promo codes */
  knownBuyers: string[];
  servers: StoreServer[];
  avgDeliveryMs: number;
  now: number;
}

/* ───────────── Theme & blocks (shared by the storefront and the builder) ───────────── */

export type StoreAccent = "azure" | "ice" | "mono";
export type StoreBackground = "grid" | "pixels" | "solid";
export type StoreDensity = "comfortable" | "compact";
export type StoreCorners = "soft" | "sharp";

export interface StoreTheme {
  accent: StoreAccent;
  background: StoreBackground;
  density: StoreDensity;
  corners: StoreCorners;
}

export type StoreBlockId =
  | "goal"
  | "recent"
  | "pools"
  | "ranks"
  | "cases"
  | "currency"
  | "kits"
  | "unban"
  | "cosmetics"
  | "rules"
  | "faq";

export interface StoreBlock {
  id: StoreBlockId;
  visible: boolean;
}
