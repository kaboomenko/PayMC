import { DAY, HOUR, MINUTE, mskDayStart } from "@/lib/mock/now";

/**
 * Landing demo for the money section: last 7 daily payouts of ArcticMC.
 * Dates are derived from the frozen NOW (Fri 6 Nov 2026, 12:00 MSK).
 */

export type PayoutStatus = "paid" | "rerouted" | "processing";

export interface PayoutLogLine {
  at: string;
  text: string;
  tone: "muted" | "ok" | "bad" | "ice";
}

export interface PayoutDay {
  id: string;
  /** payout moment (12:00 MSK of that day) */
  at: string;
  /** sales day the payout covers */
  salesDay: string;
  amount: number;
  status: PayoutStatus;
  holiday?: boolean;
  log: PayoutLogLine[];
}

const iso = (ms: number) => new Date(ms).toISOString();

function day(daysAgo: number, amount: number, status: PayoutStatus, holiday = false): PayoutDay {
  const noon = mskDayStart(daysAgo) + 12 * HOUR;
  const s = (sec: number) => iso(noon + sec * 1000);
  const log: PayoutLogLine[] =
    status === "rerouted"
      ? [
          { at: s(0), text: "Отправлено через основной банк", tone: "muted" },
          { at: s(9), text: "Основной банк отклонил: технический сбой на его стороне", tone: "bad" },
          { at: iso(noon + 40 * MINUTE), text: "Ушло резервным маршрутом — через 40 минут, без вашего участия", tone: "ice" },
          { at: iso(noon + 42 * MINUTE + 13_000), text: "Зачислено: 3 получателя", tone: "ok" },
        ]
      : status === "processing"
        ? [
            { at: s(0), text: "Выплата сформирована и отправлена", tone: "muted" },
            { at: s(0), text: "В пути — обычно доходит за 1–3 минуты", tone: "ice" },
          ]
        : [
            { at: s(0), text: holiday ? "Праздник — выплата как в обычный день" : "Выплата сформирована и отправлена", tone: "muted" },
            { at: s(38 + (daysAgo * 7) % 11), text: "Зачислено: 3 получателя · СБП и карта", tone: "ok" },
          ];
  return {
    id: `po-${daysAgo}`,
    at: iso(noon),
    salesDay: iso(noon - DAY),
    amount,
    status,
    holiday,
    log,
  };
}

export const PAYOUT_WEEK: PayoutDay[] = [
  day(6, 34_180, "paid"),
  day(5, 38_920, "paid"),
  day(4, 26_410, "rerouted"),
  day(3, 24_870, "paid"),
  day(2, 31_260, "paid", true),
  day(1, 30_462, "paid"),
  day(0, 28_315, "processing"),
];

/** index of the payout selected by default — yesterday, 30 462 ₽ */
export const DEFAULT_PAYOUT = 5;

/** Splits an amount by percentages so that the parts add up exactly (largest remainder). */
export function splitAmount(total: number, pcts: number[]) {
  const raw = pcts.map((p) => (total * p) / 100);
  const parts = raw.map(Math.floor);
  let rest = total - parts.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => ({ i, frac: r - Math.floor(r) })).sort((a, b) => b.frac - a.frac);
  for (const { i } of order) {
    if (rest <= 0) break;
    parts[i] += 1;
    rest -= 1;
  }
  return parts;
}
