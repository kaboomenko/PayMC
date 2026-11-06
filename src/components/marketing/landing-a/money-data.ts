import type { Payout } from "@/lib/mock/types";
import { DAY, HOUR, MINUTE } from "@/lib/mock/now";
import { pluralize } from "@/lib/format";

/**
 * Landing demo for the money section: the last 7 daily payouts of ArcticMC,
 * built from the same PAYOUTS the dashboard shows (amounts, exact splits,
 * the backup-bank retry). Runs on the server; the client gets plain data.
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
  /** member amounts in the order of the split members — exact, as in the dashboard */
  splits: number[];
  /** minutes until the backup route took over (rerouted days only) */
  rerouteMin?: number;
  log: PayoutLogLine[];
}

/** Russian public holidays, Moscow date "MM-DD". */
const HOLIDAYS = new Set(["01-01", "01-02", "01-03", "01-04", "01-05", "01-06", "01-07", "01-08", "02-23", "03-08", "05-01", "05-09", "06-12", "11-04"]);

const iso = (ms: number) => new Date(ms).toISOString();

function mskCalendar(ms: number) {
  const d = new Date(ms + 3 * HOUR);
  const md = `${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
  return { holiday: HOLIDAYS.has(md), weekend: d.getUTCDay() === 0 || d.getUTCDay() === 6 };
}

/**
 * @param payouts  PAYOUTS (newest first; a retry via the backup bank has the id `${id}-r`)
 * @param memberIds split members in display order
 * @param channels  where the money lands, e.g. "СБП и карта"
 */
export function buildPayoutWeek(payouts: Payout[], memberIds: string[], channels: string, days = 7): PayoutDay[] {
  const recipients = pluralize(memberIds.length, ["получатель", "получателя", "получателей"]);
  return payouts
    .filter((p) => !p.id.endsWith("-r"))
    .slice(0, days)
    .reverse()
    .map((p) => {
      const retry = payouts.find((x) => x.id === `${p.id}-r`);
      const settled = retry ?? p;
      const status: PayoutStatus = retry ? "rerouted" : p.status === "paid" ? "paid" : "processing";
      const at = Date.parse(p.createdAt);
      const { holiday, weekend } = mskCalendar(at);
      const splits = memberIds.map((id) => settled.splits.find((s) => s.memberId === id)?.amount ?? 0);

      let log: PayoutLogLine[];
      let rerouteMin: number | undefined;
      if (retry) {
        rerouteMin = Math.round((Date.parse(retry.createdAt) - at) / MINUTE);
        log = [
          { at: p.createdAt, text: "Отправлено через основной банк", tone: "muted" },
          { at: iso(at + 9_000), text: "Основной банк вернул технический отказ — сбой на его стороне", tone: "bad" },
          {
            at: retry.createdAt,
            text: `Ушло резервным маршрутом через ${pluralize(rerouteMin, ["минуту", "минуты", "минут"])}, без вашего участия`,
            tone: "ice",
          },
          { at: retry.paidAt ?? retry.createdAt, text: `Зачислено: ${recipients} · ${channels}`, tone: "ok" },
        ];
      } else if (status === "processing") {
        log = [
          { at: p.createdAt, text: "Выплата сформирована и отправлена", tone: "muted" },
          { at: p.createdAt, text: "В пути — обычно доходит за 1–3 минуты", tone: "ice" },
        ];
      } else {
        log = [
          {
            at: p.createdAt,
            text: holiday ? "Праздник — выплата как в обычный день" : weekend ? "Выходной — выплата как в будни" : "Выплата сформирована и отправлена",
            tone: "muted",
          },
          { at: p.paidAt ?? p.createdAt, text: `Зачислено: ${recipients} · ${channels}`, tone: "ok" },
        ];
      }

      return { id: p.id, at: p.createdAt, salesDay: iso(at - DAY), amount: settled.amount, status, splits, rerouteMin, log };
    });
}
