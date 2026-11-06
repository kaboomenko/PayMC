/**
 * Small formatting helpers for orders/players built on top of @/lib/format.
 * Client-safe: no mock data imports.
 */
import { formatDate, formatDuration, formatNumber, formatTime } from "@/lib/format";

const NBSP = " ";

/** 0,4 с · 2,1 с · 14 мин — delivery time as players feel it */
export function formatDeliveryTime(ms: number) {
  if (ms < 60_000) return `${formatNumber(ms / 1000, 1)}${NBSP}с`;
  return formatDuration(ms).replace(" ", NBSP);
}

/** 14:05:12.348 (MSK) — absolute time of a trace step */
export function formatClock(at: string | number | Date) {
  const ms = new Date(at).getUTCMilliseconds();
  return `${formatTime(at, true)}.${String(ms).padStart(3, "0")}`;
}

/** 6 ноября 2026, 14:05:12 МСК */
export function formatExact(at: string | number | Date) {
  return `${formatDate(at)}, ${formatTime(at, true)} МСК`;
}

/** +38 мс · +5 с · +2 мин */
export function formatDelta(ms: number) {
  return `+${formatDuration(ms).replace(" ", NBSP)}`;
}

export type RiskTone = "ok" | "warn" | "bad";

export function riskTone(score: number): RiskTone {
  if (score >= 60) return "bad";
  if (score >= 30) return "warn";
  return "ok";
}

export const riskLabel: Record<RiskTone, string> = {
  ok: "низкий",
  warn: "средний",
  bad: "высокий",
};

export const toneText: Record<RiskTone, string> = {
  ok: "text-ok",
  warn: "text-warn",
  bad: "text-bad",
};

export const toneBg: Record<RiskTone, string> = {
  ok: "bg-ok",
  warn: "bg-warn",
  bad: "bg-bad",
};
