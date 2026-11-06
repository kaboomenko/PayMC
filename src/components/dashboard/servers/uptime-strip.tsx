import { cn } from "@/lib/utils";
import type { UptimeDay } from "./types";

const TONE: Record<UptimeDay, string> = { ok: "bg-ok/70", warn: "bg-warn", bad: "bg-bad" };
const LABEL: Record<UptimeDay, string> = { ok: "без сбоев", warn: "медленно отвечал", bad: "был недоступен" };

/** 30-day status-page strip: one bar per day, oldest → today. Server-safe. */
export function UptimeStrip({ days, className, tall = false }: { days: UptimeDay[]; className?: string; tall?: boolean }) {
  const bad = days.filter((d) => d !== "ok").length;
  return (
    <div
      role="img"
      aria-label={bad ? `За 30 дней ${bad} дн. со сбоями` : "30 дней без сбоев"}
      className={cn("flex items-end gap-[2px]", tall ? "h-7" : "h-3.5", className)}
    >
      {days.map((d, i) => (
        <span
          key={i}
          title={`${30 - i === 1 ? "Сегодня" : `${30 - i - 1} дн. назад`}: ${LABEL[d]}`}
          className={cn("h-full min-w-[2px] flex-1 rounded-[1px]", TONE[d], d === "ok" && i < days.length - 1 && "opacity-60")}
        />
      ))}
    </div>
  );
}
