/**
 * Serializable shapes passed from the orders page (server) to its client islands.
 * Keep them lean: one page of rows, one order with its trace.
 */
import type { CountryCode, Order, OrderStatus, PaymentMethod, ProductKind, ServerStatus } from "@/lib/mock/types";

export interface ServerOption {
  id: string;
  name: string;
  status: ServerStatus;
}

export interface OrderRow {
  id: string;
  playerId: string;
  playerName: string;
  items: { name: string; qty: number }[];
  amount: number;
  method: PaymentMethod;
  status: OrderStatus;
  createdAt: string;
  deliveryMs?: number;
  serverId: string;
  promoCode?: string;
  creatorCode?: string;
  giftTo?: string;
  country: CountryCode;
}

export interface OrderDetail extends Order {
  serverName: string;
  serverStatus: ServerStatus;
  campaignName?: string;
  /** what the player sees in chat once the order is delivered */
  chat: { broadcast: string; personal: string };
  itemKinds: ProductKind[];
  /** plan rate (or mobile-balance rate) the fee was charged at, 0.039 */
  feeRate: number;
}
