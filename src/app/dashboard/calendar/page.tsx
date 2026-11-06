import type { Metadata } from "next";
import { Suspense } from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { KpiStrip, Unit } from "@/components/dashboard/growth/kpi-strip";
import { QueryButton } from "@/components/dashboard/growth/query-button";
import { CalendarBoard } from "@/components/dashboard/growth/calendar-board";
import { formatNumber } from "@/lib/format";
import { CALENDAR, DAY, FORECAST, KRAKEN_WIPES, NOW_MS, SERVERS } from "@/lib/mock";

export const metadata: Metadata = { title: "Календарь акций" };

const MONTH_KEYS = ["2026-10", "2026-11", "2026-12", "2027-01"];

export default async function CalendarPage({ searchParams }: PageProps<"/dashboard/calendar">) {
  const sp = await searchParams;
  const monthParam = typeof sp.month === "string" ? sp.month : undefined;
  const initialMonth = Math.max(0, MONTH_KEYS.indexOf(monthParam ?? "2026-11"));

  const servers = SERVERS.map((s) => ({ id: s.id, name: s.name }));
  const upcoming = CALENDAR.filter((e) => new Date(e.end).getTime() >= NOW_MS);
  const auto = upcoming.filter((e) => e.autoStart).length;
  const next30 = CALENDAR.filter((e) => {
    const t = new Date(e.start).getTime();
    return t >= NOW_MS && t < NOW_MS + 30 * DAY;
  });
  const bf = CALENDAR.find((e) => e.id === "ev-bf")!;
  const wipe = CALENDAR.find((e) => e.id === "ev-wipe-anarchy")!;
  const daysToWipe = Math.ceil((new Date(wipe.start).getTime() - NOW_MS) / DAY);
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

      <KpiStrip
        items={[
          { label: "Впереди", value: upcoming.length, sub: `${next30.length} в ближайшие 30 дней` },
          {
            label: "Запустятся сами",
            value: (
              <>
                {auto}
                <Unit>из {upcoming.length}</Unit>
              </>
            ),
            sub: "скидки, промокоды и анонсы",
          },
          { label: "До вайпа Анархии", value: <>{daysToWipe}<Unit>дн</Unit></>, sub: "1 декабря, 12:00 · −20 % на 6 часов" },
          {
            label: "Прогноз · 30 дней",
            value: (
              <>
                {formatNumber(Math.round(forecast / 1000))}
                <Unit>тыс ₽</Unit>
              </>
            ),
            sub: `${Math.round((promoDays / forecast) * 100)} % — в дни Чёрной пятницы и вайпа`,
          },
        ]}
      />

      <Suspense>
        <CalendarBoard events={CALENDAR} krakenWipes={KRAKEN_WIPES} servers={servers} initialMonth={initialMonth} />
      </Suspense>
    </>
  );
}
