/**
 * Domain model of the PayMC concept. This is the contract between the
 * (future) backend and the UI. Everything the dashboard renders comes from
 * these types; mock data in ./data.ts implements them deterministically.
 */

export type GameId =
  | "minecraft"
  | "rust"
  | "gta5"
  | "ark"
  | "unturned"
  | "gmod"
  | "cs2"
  | "dayz"
  | "scum"
  | "7dtd"
  | "pz"
  | "valheim"
  | "palworld"
  | "terraria"
  | "hytale"
  | "samp";

export type PaymentMethod =
  | "sbp"
  | "card"
  | "sberpay"
  | "tpay"
  | "yoomoney"
  | "mirpay"
  | "mobile"
  | "kaspi"
  | "erip"
  | "crypto"
  | "intl_card";

export type CountryCode = "RU" | "KZ" | "BY" | "UZ" | "AM" | "KG" | "GE" | "UA" | "DE" | "PL";

export type ISODate = string;

/* ───────────── Project & servers ───────────── */

export type Plan = "start" | "pro" | "network";

export interface Project {
  id: string;
  name: string;
  slug: string; // storefront: {slug}.paymc.ru
  game: GameId;
  domain?: string; // custom domain
  plan: Plan;
  createdAt: ISODate;
  /** monthly goal shown on storefront and in-game (e.g. hosting bill) */
  goal?: { title: string; target: number; raised: number };
}

export type ConnectionKind = "plugin" | "mod" | "rcon" | "webrcon" | "resource";
export type ServerStatus = "online" | "degraded" | "offline";

export interface GameServer {
  id: string;
  projectId: string;
  name: string; // "Выживание", "Анархия"
  game: GameId;
  platform: string; // "Paper 1.21.4", "Oxide 2.0.6", "RAGE:MP 1.1"
  address: string; // play.arcticmc.ru:25565
  connection: ConnectionKind;
  agentVersion: string; // PayMC plugin/mod version, e.g. "2.4.1"
  status: ServerStatus;
  online: number;
  maxOnline: number;
  latencyMs: number;
  /** commands waiting to be executed (e.g. server was offline) */
  queue: number;
  lastSeenAt: ISODate;
  uptime30d: number; // %
  region: string; // "Москва", "Франкфурт"
  tps?: number; // Minecraft only
  /** 24 hourly online samples for sparkline */
  onlineHistory: number[];
  /** next wipe — Rust/ARK style games */
  nextWipeAt?: ISODate;
}

/* ───────────── Catalog ───────────── */

export type ProductKind =
  | "rank" // привилегия
  | "currency" // донат-валюта
  | "kit" // набор
  | "case" // кейс / ключи
  | "unban" // разбан / размут
  | "cosmetic" // питомцы, частицы, префиксы
  | "pool" // складчина — игроки скидываются вместе
  | "subscription"; // ежемесячная подписка

export type EulaLevel = "ok" | "warn" | "risk";

export interface DeliveryCommand {
  id: string;
  /** e.g. "lp user {player} parent addtemp frost {days}d" */
  template: string;
  /** "all" or a server id */
  serverId: string | "all";
  /** wait for the player to be online before executing */
  requireOnline: boolean;
  delaySec?: number;
  /** template library id this command came from, e.g. "luckperms.addtemp" */
  templateId?: string;
}

export interface Product {
  id: string;
  projectId: string;
  name: string;
  kind: ProductKind;
  category: string; // display category on storefront: "Привилегии"
  description: string;
  perks?: string[]; // bullet list on storefront
  price: number; // RUB
  oldPrice?: number;
  durationDays?: number | null; // null = навсегда
  commands: DeliveryCommand[];
  serverIds: string[];
  status: "active" | "draft" | "hidden";
  badge?: "hit" | "new" | "sale" | "limited";
  /** 30-day stats */
  views30d: number;
  sales30d: number;
  revenue30d: number;
  /** last 14 days of sales for sparkline */
  salesTrend: number[];
  stock?: number | null;
  eula: { level: EulaLevel; note?: string };
  /** pool (складчина) state */
  pool?: { target: number; raised: number; contributors: number; endsAt: ISODate };
  /** accent tint for the generated product art: 0..5 */
  tint: number;
  glyph: string; // 1-3 chars shown on generated product art
  createdAt: ISODate;
  sort: number;
}

/* ───────────── Orders & delivery ───────────── */

export type OrderStatus =
  | "delivered"
  | "delivering"
  | "awaiting_player" // игрок офлайн — выдадим при входе
  | "retrying"
  | "failed"
  | "refunded"
  | "chargeback";

export type TraceStepKind =
  | "payment"
  | "webhook"
  | "queued"
  | "sent"
  | "executed"
  | "confirmed"
  | "awaiting_player"
  | "retry"
  | "error"
  | "refund"
  | "receipt";

export interface TraceStep {
  id: string;
  kind: TraceStepKind;
  title: string; // "Платёж подтверждён"
  at: ISODate;
  /** ms since previous step */
  deltaMs?: number;
  detail?: string; // "СБП · Т-Банк"
  command?: string; // executed command
  output?: string; // console response
  status: "ok" | "warn" | "error" | "pending";
}

export interface OrderItem {
  productId: string;
  name: string;
  qty: number;
  price: number;
}

export interface Order {
  id: string; // "PMC-104823"
  projectId: string;
  playerId: string;
  playerName: string;
  items: OrderItem[];
  amount: number; // paid by player, RUB
  fee: number; // PayMC commission
  net: number; // to owner
  method: PaymentMethod;
  status: OrderStatus;
  createdAt: ISODate;
  deliveredAt?: ISODate;
  deliveryMs?: number;
  serverId: string;
  country: CountryCode;
  promoCode?: string;
  creatorCode?: string;
  campaignId?: string;
  giftTo?: string; // bought as a gift for another player
  risk: number; // 0–100
  receipt?: { status: "sent" | "pending" | "not_required"; number?: string };
  trace: TraceStep[];
}

/* ───────────── Players ───────────── */

export type PlayerSegment = "whale" | "loyal" | "new" | "at_risk" | "dormant";
export type PlayerFlag = "chargeback" | "network_blacklist" | "vpn" | "many_cards" | "minor_suspect";

export interface Player {
  id: string;
  name: string;
  /** Minecraft UUID or SteamID64 or Social Club id — depends on game */
  externalId: string;
  country: CountryCode;
  firstSeenAt: ISODate;
  lastSeenAt: ISODate;
  online: boolean;
  serverId?: string; // where online now
  playtimeMin: number;
  ltv: number;
  orders: number;
  avgCheck: number;
  lastOrderAt?: ISODate;
  segment: PlayerSegment;
  risk: number;
  flags: PlayerFlag[];
  discord?: string;
  telegram?: string;
  favoriteCategory?: string;
  /** monthly spend for the last 6 months */
  spendHistory: number[];
  activeRanks: { name: string; expiresAt: ISODate | null }[];
}

/* ───────────── Money ───────────── */

export type PayoutStatus = "paid" | "processing" | "scheduled" | "failed";

export interface PayoutSplit {
  memberId: string;
  amount: number;
}

export interface Payout {
  id: string;
  amount: number;
  fee: number;
  method: "card" | "sbp" | "account" | "usdt";
  destination: string; // "Т-Банк · •• 4417"
  status: PayoutStatus;
  createdAt: ISODate;
  paidAt?: ISODate;
  splits: PayoutSplit[];
}

export type MemberRole = "owner" | "admin" | "developer" | "moderator" | "accountant";

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: MemberRole;
  /** share of every payout, % (sums to 100 across members with split) */
  splitPct: number;
  payoutDestination?: string;
  taxStatus?: "self_employed" | "ip" | "individual";
  lastActiveAt: ISODate;
}

export interface Balance {
  available: number;
  pending: number; // in hold (e.g. 24h for cards)
  reserved: number; // chargeback reserve
  nextPayoutAt: ISODate;
  todayGross: number;
}

export interface TaxSummary {
  regime: "npd"; // самозанятый
  yearIncome: number;
  limit: number; // 2 400 000
  receiptsIssued: number;
  receiptsPending: number;
  taxDue: number; // текущий месяц
  rate: number; // 4 or 6
}

/* ───────────── Growth ───────────── */

export type CampaignType =
  | "abandoned_cart"
  | "winback"
  | "first_purchase"
  | "rank_expiring"
  | "wipe_day"
  | "playtime_milestone"
  | "purchase_broadcast"
  | "goal_progress";

export type CampaignChannel = "chat" | "title" | "bossbar" | "actionbar" | "discord" | "telegram" | "vk";

export interface Campaign {
  id: string;
  name: string;
  type: CampaignType;
  trigger: string; // human readable: "Игрок добавил товар в корзину и не оплатил 30 минут"
  channels: CampaignChannel[];
  message: string; // supports {player}, {product}, {discount}, {link}
  offer?: { discountPct: number; productId?: string; ttlHours: number };
  status: "active" | "paused" | "draft";
  stats: { reached: number; clicked: number; converted: number; revenue: number };
  createdAt: ISODate;
}

export interface PromoCode {
  id: string;
  code: string;
  kind: "percent" | "fixed";
  value: number;
  uses: number;
  limit?: number;
  expiresAt?: ISODate;
  revenue: number;
  status: "active" | "paused" | "expired";
  scope: "all" | string[]; // product ids
  firstPurchaseOnly?: boolean;
  minAmount?: number;
}

export type CreatorPlatform = "youtube" | "twitch" | "vk" | "tiktok" | "telegram" | "kick";

export interface Creator {
  id: string;
  name: string;
  platform: CreatorPlatform;
  handle: string;
  followers: number;
  code: string;
  sharePct: number;
  buyers: number;
  revenue: number;
  owed: number;
  paidOut: number;
  status: "active" | "paused" | "invited";
  joinedAt: ISODate;
  /** daily revenue for the last 30 days */
  trend: number[];
}

export type CalendarEventKind = "wipe" | "sale" | "event" | "holiday" | "season";

export interface CalendarEvent {
  id: string;
  title: string;
  kind: CalendarEventKind;
  start: ISODate;
  end: ISODate;
  serverIds?: string[];
  discountPct?: number;
  autoStart: boolean;
  /** forecasted revenue uplift, % */
  expectedUplift?: number;
  note?: string;
}

export interface ExperimentVariant {
  id: string;
  name: string;
  description: string;
  traffic: number; // %
  visitors: number;
  conversions: number;
  revenue: number;
}

export interface Experiment {
  id: string;
  name: string;
  hypothesis: string;
  status: "running" | "completed" | "draft";
  metric: "conversion" | "revenue_per_visitor" | "avg_check";
  startedAt?: ISODate;
  endsAt?: ISODate;
  variants: ExperimentVariant[];
  /** probability that the best variant beats control, 0..1 */
  probabilityToBeat?: number;
  winnerId?: string;
}

/* ───────────── Activity, analytics ───────────── */

export type ActivityKind =
  | "order"
  | "delivery_failed"
  | "awaiting_player"
  | "payout"
  | "chargeback"
  | "server_offline"
  | "server_online"
  | "campaign"
  | "member"
  | "receipt"
  | "fraud_blocked";

export interface ActivityEvent {
  id: string;
  kind: ActivityKind;
  title: string;
  description?: string;
  at: ISODate;
  href?: string;
  amount?: number;
}

export interface DailyPoint {
  date: ISODate; // day start, MSK
  revenue: number;
  orders: number;
  buyers: number;
  newBuyers: number;
  peakOnline: number;
  uniquePlayers: number;
  refunds: number;
}

export interface ForecastPoint {
  date: ISODate;
  low: number;
  mid: number;
  high: number;
}

export interface FunnelStep {
  id: string;
  label: string;
  value: number;
}

export interface Integration {
  id: string;
  name: string;
  category: "community" | "notifications" | "analytics" | "developer" | "tax" | "monitoring";
  description: string;
  status: "connected" | "available" | "soon";
  detail?: string; // "#purchases · 3 события"
}
