import type { Balance, MemberRole, PayoutStatus, TeamMember } from "@/lib/mock/types";

/** Serializable slices the finance page passes from the server to client components. */

export type FinanceTab = "overview" | "payouts" | "split" | "taxes" | "documents";
export const FINANCE_TABS: readonly FinanceTab[] = ["overview", "payouts", "split", "taxes", "documents"];

export interface FinanceMember {
  id: string;
  name: string;
  email: string;
  role: MemberRole;
  splitPct: number;
  payoutDestination?: string;
  taxStatus?: TeamMember["taxStatus"];
}

export interface PayoutRow {
  id: string;
  amount: number;
  status: PayoutStatus;
  createdAt: string;
  paidAt?: string;
  destination: string;
  /** "primary" — Т-Банк, "backup" — retried via Точка */
  route: "primary" | "backup";
  splits: { memberId: string; amount: number }[];
  /** for the failed payout: id of its retry, and vice versa */
  retryId?: string;
  retryOf?: string;
}

export interface Incident {
  failedId: string;
  retryId: string;
  amount: number;
  failedAt: string;
  retryAt: string;
  paidAt: string;
}

export interface TierInfo {
  label: string;
  rate: number;
  monthTurnover: number;
  monthForecast: number;
  prevMonthTurnover: number;
  prevMonthFee: number;
  /** what October would have cost on the base 4,9 % rate */
  savedVsStart: number;
  floor: number;
  next: number;
  nextLabel: string;
  nextRate: number;
}

export interface TaxInfo {
  yearIncome: number;
  limit: number;
  projected: number;
  receiptsIssued: number;
  receiptsPending: number;
  taxDue: number;
  rate: number;
  ownerShare: number;
  avgDailyIncome: number;
  daysLeft: number;
}

export interface ReceiptRow {
  orderId: string;
  number?: string;
  at: string;
  player: string;
  item: string;
  amount: number;
  status: "sent" | "pending";
}

export interface FinanceData {
  balance: Balance;
  ordersToday: number;
  /** today's payout (sent at 12:00, still in flight) */
  todayPayout: { amount: number; createdAt: string; status: PayoutStatus } | null;
  nextPayout: { at: string; inMs: number; estimate: number; earnedToday: number; expectedRest: number };
  members: FinanceMember[];
  payouts: PayoutRow[];
  incident: Incident | null;
  dailyNet: { date: string; net: number }[];
  tier: TierInfo;
  tax: TaxInfo;
  receipts: ReceiptRow[];
  now: number;
}
