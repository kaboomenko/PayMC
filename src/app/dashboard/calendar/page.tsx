import type { Metadata } from "next";
import { Suspense } from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { QueryButton } from "@/components/dashboard/growth/query-button";
import { CalendarBoard } from "@/components/dashboard/growth/calendar-board";
import { formatDate, formatPercent, formatTime, pluralize } from "@/lib/format";
import { CALENDAR, CURRENT_PROJECT_ID, DAY, FORECAST, KRAKEN_WIPES, NOW_MS, SERVERS } from "@/lib/mock";

export const metadata: Metadata = { title: "Календарь акций" };

const MONTH_KEYS = ["2026-10", "2026-11", "2026-12", "2027-01"];

export default async function CalendarPage({ searchParams }: PageProps<"/dashboard/calendar">) {
  const sp = await searchParams;
  const monthParam = typeof sp.month === "string" ? sp.month : undefined;
  const initialMonth = Math.max(0, MONTH_KEYS.indexOf(monthParam ?? "2026-11"));

  // the dialog offers only this project's servers; labels also need the Kraken example ids
  const servers = SERVERS.filter((s) => s.projectId === CURRENT_PROJECT_ID).map((s) => ({ id: s.id, name: s.name }));
  const serverNames = Object.fromEntries(SERVERS.map((s) => [s.id, s.name]));

  const bf = CALENDAR.find((e) => e.id === "ev-bf")!;
  const wipe = CALENDAR.find((e) => e.id === "ev-wipe-anarchy")!;
  const wipeHours = Math.round((new Date(wipe.end).getTime() - new Date(wipe.start).getTime()) / (DAY / 24));
  const forecast = FORECAST.reduce((a, p) => a + p.mid, 0);
  const promoDays = FORECAST.filter((p) => {
    const t = new Date(p.date).getTime();
    return (t >= new Date(bf.start).getTime() - DAY && t <= new Date(bf.end).getTime()) || Math.abs(t - new Date(wipe.start).getTime()) < DAY;
  }).reduce((a, p) => a + p.mid, 0);

  return (
    <>
      <PageHeader
        title="Календарь акций"
        description="Вайпы, сезоны и распродажи на одной шкале. Скидки и анонсы включаются сами — без ночных дежурств."
        actions={
          <Suspense>
            <QueryButton param="new" variant="primary" size="sm" hotkey="n">
              <Plus /> Новая акция
            </QueryButton>
          </Suspense>
        }
      />

      <Suspense>
        <CalendarBoard
          events={CALENDAR}
          krakenWipes={KRAKEN_WIPES}
          servers={servers}
          serverNames={serverNames}
          initialMonth={initialMonth}
          kpi={{
            daysToWipe: Math.ceil((new Date(wipe.start).getTime() - NOW_MS) / DAY),
            wipeNote: `${formatDate(wipe.start, { year: false })}, ${formatTime(wipe.start)} · −${formatPercent(wipe.discountPct ?? 0, { digits: 0 })} на ${pluralize(wipeHours, ["час", "часа", "часов"])}`,
            forecastK: Math.round(forecast / 1000),
            promoShare: Math.round((promoDays / forecast) * 100),
          }}
        />
      </Suspense>
    </>
  );
}
