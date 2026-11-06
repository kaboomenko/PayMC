"use client";

import * as React from "react";
import Link from "next/link";
import { CalendarPlus, ChevronLeft, ChevronRight, Link2, Megaphone, Percent, Plus, TimerReset } from "lucide-react";
import { cn } from "@/lib/utils";
import { MONTHS_NOM, formatDate, formatDateShort, formatNumber, formatPercent, formatRelative, formatTime, plural } from "@/lib/format";
import { DAY, HOUR, NOW, NOW_MS, msk } from "@/lib/mock/now";
import { calendarKindMeta } from "@/lib/mock/meta";
import type { CalendarEvent, CalendarEventKind } from "@/lib/mock/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Segmented } from "@/components/ui/segmented";
import { EmptyState } from "@/components/ui/empty-state";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Field, Input, Label } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/components/ui/toaster";
import { KpiStrip, Unit } from "./kpi-strip";
import { demoBar, demoSwatch, kindBar, kindSwatch, toneDot } from "./tone";
import { useHotkey, useQueryState } from "./use-query-state";

export interface CalServer {
  id: string;
  name: string;
}

/** Figures computed on the server: the wipe countdown and the revenue forecast. */
export interface CalendarKpiBase {
  daysToWipe: number;
  wipeNote: string;
  forecastK: number;
  promoShare: number;
}

type CalEvent = CalendarEvent & { demo?: boolean };

const MSK = 3 * HOUR;
const dayIdx = (iso: string) => Math.floor((new Date(iso).getTime() + MSK) / DAY);
/** Last day an event occupies — an end at exactly 00:00 belongs to the previous day. */
const endIdx = (ev: CalendarEvent) => Math.max(dayIdx(ev.start), Math.floor((new Date(ev.end).getTime() - 1 + MSK) / DAY));
const idxOf = (y: number, m: number, d: number) => Date.UTC(y, m, d) / DAY;
const dow = (idx: number) => (new Date(idx * DAY).getUTCDay() + 6) % 7; // Mon = 0
const dom = (idx: number) => new Date(idx * DAY).getUTCDate();
const TODAY = dayIdx(NOW.toISOString());

const MONTHS = [
  { y: 2026, m: 9 },
  { y: 2026, m: 10 },
  { y: 2026, m: 11 },
  { y: 2027, m: 0 },
];
const WEEKDAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const KINDS = Object.keys(calendarKindMeta) as CalendarEventKind[];

export function eventRange(ev: CalendarEvent) {
  const { date, time } = rangeParts(ev);
  return time ? `${date}, ${time}` : date;
}

/** Date and (for one-day events) time range separately — the list puts them on two lines. */
function rangeParts(ev: CalendarEvent): { date: string; time?: string } {
  const s = dayIdx(ev.start);
  const e = endIdx(ev);
  const fullDay = formatTime(ev.start) === "00:00" && formatTime(ev.end) === "23:59";
  if (s === e) return { date: formatDate(ev.start, { year: false }), time: fullDay ? undefined : `${formatTime(ev.start)}–${formatTime(ev.end)}` };
  const sameMonth = new Date(s * DAY).getUTCMonth() === new Date(e * DAY).getUTCMonth();
  return { date: sameMonth ? `${dom(s)}–${formatDate(ev.end, { year: false })}` : `${formatDate(ev.start, { year: false })} – ${formatDate(ev.end, { year: false })}` };
}

function Swatch({ ev, className }: { ev: CalEvent; className?: string }) {
  return <span aria-hidden className={cn("h-2.5 w-3.5 shrink-0 rounded-[2px]", ev.demo ? demoSwatch : kindSwatch[ev.kind], className)} />;
}

interface Seg {
  ev: CalEvent;
  from: number;
  to: number;
  lane: number;
  contL: boolean;
  contR: boolean;
}

function layoutWeek(start: number, events: CalEvent[], maxLanes: number) {
  const items = events
    .map((ev) => ({ ev, s: dayIdx(ev.start), e: endIdx(ev) }))
    .filter((x) => x.s <= start + 6 && x.e >= start)
    .sort((a, b) => a.s - b.s || b.e - b.s - (a.e - a.s));
  const laneEnds: number[] = [];
  const placed: Seg[] = [];
  /** events that didn't fit, per weekday — reachable from the «+N» button */
  const hidden: CalEvent[][] = Array.from({ length: 7 }, () => []);
  for (const x of items) {
    const from = Math.max(x.s, start) - start;
    const to = Math.min(x.e, start + 6) - start;
    let lane = laneEnds.findIndex((end) => end < from);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(to);
    } else laneEnds[lane] = to;
    if (lane >= maxLanes) {
      for (let d = from; d <= to; d++) hidden[d].push(x.ev);
      continue;
    }
    placed.push({ ev: x.ev, from, to, lane, contL: x.s < start, contR: x.e > start + 6 });
  }
  return { placed, hidden, lanes: Math.min(laneEnds.length, maxLanes) };
}

export function CalendarBoard({
  events: initialEvents,
  krakenWipes,
  servers,
  serverNames,
  initialMonth,
  kpi,
}: {
  events: CalendarEvent[];
  krakenWipes: CalendarEvent[];
  /** this project's servers — the only ones a new promo can target */
  servers: CalServer[];
  /** id → name for every server a shown event mentions, Kraken example included */
  serverNames: Record<string, string>;
  initialMonth: number;
  kpi: CalendarKpiBase;
}) {
  const [events, setEvents] = React.useState<CalEvent[]>(initialEvents);
  const [month, setMonth] = React.useState(initialMonth);
  const [view, setView] = React.useState<"month" | "list">("month");
  const [showRust, setShowRust] = React.useState(false);
  const [newParam, setNewParam] = useQueryState("new");
  const serverName = React.useMemo(() => new Map(Object.entries(serverNames)), [serverNames]);

  useHotkey("n", () => setNewParam("1"));

  const setAuto = (id: string, autoStart: boolean) => {
    setEvents((list) => list.map((e) => (e.id === id ? { ...e, autoStart } : e)));
    const ev = events.find((e) => e.id === id);
    toast(autoStart ? "Автозапуск включён" : "Автозапуск выключен", {
      description: ev ? `${ev.title} · ${autoStart ? "скидки и анонсы стартуют сами" : "запустите вручную в день акции"}` : undefined,
      action: { label: "Отменить", onClick: () => setEvents((list) => list.map((e) => (e.id === id ? { ...e, autoStart: !autoStart } : e))) },
    });
  };

  const shown: CalEvent[] = showRust ? [...events, ...krakenWipes.map((w) => ({ ...w, demo: true }))] : events;
  const { y, m } = MONTHS[month];
  const first = idxOf(y, m, 1);
  const last = idxOf(y, m + 1, 1) - 1;
  const gridStart = first - dow(first);
  const gridEnd = last + (6 - dow(last));
  const weeks: number[] = [];
  for (let s = gridStart; s <= gridEnd; s += 7) weeks.push(s);
  const monthEvents = shown
    .filter((e) => dayIdx(e.start) <= last && endIdx(e) >= first)
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  const ahead = events.filter((e) => new Date(e.end).getTime() >= NOW_MS).sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  const upcoming = ahead.slice(0, 5);
  const autoCount = ahead.filter((e) => e.autoStart).length;
  const next30 = ahead.filter((e) => {
    const t = new Date(e.start).getTime();
    return t >= NOW_MS && t < NOW_MS + 30 * DAY;
  }).length;

  return (
    <>
      <KpiStrip
        items={[
          { label: "Впереди", value: ahead.length, sub: `${next30} в ближайшие 30 дней` },
          {
            label: "Запустятся сами",
            value: (
              <>
                {autoCount}
                <Unit>из {ahead.length}</Unit>
              </>
            ),
            sub: "скидки, промокоды и анонсы",
          },
          {
            label: "До вайпа Анархии",
            value: (
              <>
                {kpi.daysToWipe}
                <Unit>{plural(kpi.daysToWipe, ["день", "дня", "дней"])}</Unit>
              </>
            ),
            sub: kpi.wipeNote,
          },
          {
            label: "Прогноз · 30 дней",
            value: (
              <>
                {formatNumber(kpi.forecastK)}
                <Unit>тыс ₽</Unit>
              </>
            ),
            sub: `${formatPercent(kpi.promoShare, { digits: 0 })} — в дни Чёрной пятницы и вайпа`,
          },
        ]}
      />

      <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="min-w-0 overflow-hidden rounded-xl border border-line bg-surface shadow-raise">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-3 py-3 sm:px-4">
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon-sm" aria-label="Предыдущий месяц" disabled={month === 0} onClick={() => setMonth((v) => v - 1)}>
                <ChevronLeft />
              </Button>
              <h2 className="min-w-[132px] text-center text-[15px] font-semibold tracking-[-0.015em] text-fg">
                {MONTHS_NOM[m]} <span className="font-mono text-fg-3">{y}</span>
              </h2>
              <Button variant="ghost" size="icon-sm" aria-label="Следующий месяц" disabled={month === MONTHS.length - 1} onClick={() => setMonth((v) => v + 1)}>
                <ChevronRight />
              </Button>
              <Button variant="ghost" size="xs" className="ml-1" onClick={() => setMonth(1)} disabled={month === 1}>
                Сегодня
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-[12.5px] text-fg-2">
                <Switch size="sm" checked={showRust} onCheckedChange={setShowRust} aria-label="Показать вайпы Rust" />
                Вайпы Rust <span className="text-fg-4">· пример</span>
              </label>
              <Segmented<"month" | "list">
                size="xs"
                value={view}
                onChange={setView}
                options={[
                  { value: "month", label: "Месяц" },
                  { value: "list", label: "Список" },
                ]}
              />
            </div>
          </header>

          {view === "month" ? (
            <div>
              <div className="grid grid-cols-7 border-b border-line-soft">
                {WEEKDAYS.map((d, i) => (
                  <div key={d} className={cn("px-2 py-1.5 font-mono text-[10.5px] tracking-[0.06em] uppercase", i >= 5 ? "text-fg-4" : "text-fg-3")}>
                    {d}
                  </div>
                ))}
              </div>
              {weeks.map((ws) => (
                <WeekRow
                  key={ws}
                  start={ws}
                  first={first}
                  last={last}
                  events={shown}
                  serverName={serverName}
                  onAuto={setAuto}
                />
              ))}
            </div>
          ) : (
            <ul className="divide-y divide-line-soft">
              {monthEvents.length === 0 ? (
                <li>
                  <EmptyState
                    icon={<CalendarPlus />}
                    title={`В ${MONTHS_NOM[m].toLowerCase().replace(/ь$/, "е")} пока пусто`}
                    description="Добавьте акцию или привяжите скидку к вайпу — она запустится сама."
                  />
                </li>
              ) : (
                monthEvents.map((ev) => {
                  const range = rangeParts(ev);
                  return (
                    // phones: one column, the date is a small mono line above the title
                    <li key={ev.id} className="grid grid-cols-1 gap-y-1 px-4 py-3 sm:grid-cols-[176px_minmax(0,1fr)_auto] sm:items-center sm:gap-x-3">
                      <span className="font-mono text-[11.5px] leading-tight text-fg-3 nums sm:text-[12px]">
                        {range.date}
                        {range.time ? (
                          <>
                            <span className="sm:hidden">, </span>
                            <span className="text-fg-4 sm:mt-0.5 sm:block">{range.time}</span>
                          </>
                        ) : null}
                      </span>
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 text-[13.5px] text-fg">
                          <Swatch ev={ev} />
                          <span className="truncate">{ev.title}</span>
                        </p>
                        <p className="mt-0.5 truncate pl-[22px] text-xs text-fg-3">
                          {calendarKindMeta[ev.kind].label}
                          {ev.serverIds?.length ? ` · ${ev.serverIds.map((s) => serverName.get(s) ?? s).join(", ")}` : " · все серверы"}
                          {ev.discountPct ? ` · −${formatPercent(ev.discountPct, { digits: 0 })}` : ""}
                          {ev.expectedUplift ? ` · +${formatPercent(ev.expectedUplift, { digits: 0 })} к выручке` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 pl-[22px] sm:pl-0">
                        {ev.demo ? (
                          <Badge tone="outline">Kraken Rust</Badge>
                        ) : (
                          <label className="flex items-center gap-2 text-xs text-fg-3">
                            Автозапуск
                            <Switch size="sm" checked={ev.autoStart} onCheckedChange={(v) => setAuto(ev.id, v)} aria-label={`Автозапуск: ${ev.title}`} />
                          </label>
                        )}
                      </div>
                    </li>
                  );
                })
              )}
            </ul>
          )}

          <footer className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line-soft px-4 py-2.5">
            {KINDS.map((k) => (
              <span key={k} className="flex items-center gap-1.5 text-[11.5px] text-fg-3">
                <span className={cn("h-2.5 w-3.5 rounded-[2px]", kindSwatch[k])} />
                {calendarKindMeta[k].label}
              </span>
            ))}
            {showRust ? (
              <span className="flex items-center gap-1.5 text-[11.5px] text-fg-3">
                <span className={cn("h-2.5 w-3.5 rounded-[2px]", demoSwatch)} />
                пример: Kraken Rust
              </span>
            ) : null}
          </footer>
        </section>

        <aside className="rounded-xl border border-line bg-surface shadow-raise">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="text-[15px] font-semibold tracking-[-0.015em] text-fg">Ближайшие</h2>
            <span className="font-mono text-[11px] text-fg-4">автозапуск</span>
          </div>
          {upcoming.length ? (
            <ul className="divide-y divide-line-soft">
              {upcoming.map((ev) => {
                const live = new Date(ev.start).getTime() <= NOW_MS;
                return (
                  <li key={ev.id} className="px-4 py-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 text-[11.5px] text-fg-3">
                          <Swatch ev={ev} className="h-2 w-3" />
                          {calendarKindMeta[ev.kind].label} ·{" "}
                          {live ? <span className="text-ok">идёт сейчас</span> : formatRelative(ev.start, NOW_MS)}
                        </p>
                        <p className="mt-1 text-[13.5px] leading-snug font-medium text-fg">{ev.title}</p>
                        <p className="mt-0.5 font-mono text-[11.5px] text-fg-3">
                          {eventRange(ev)}
                          {ev.discountPct ? <span className="text-ice-300"> · −{formatPercent(ev.discountPct, { digits: 0 })}</span> : null}
                        </p>
                      </div>
                      <Switch size="sm" checked={ev.autoStart} onCheckedChange={(v) => setAuto(ev.id, v)} aria-label={`Автозапуск: ${ev.title}`} className="mt-1" />
                    </div>
                    {ev.expectedUplift ? (
                      <p className="mt-2 text-xs text-fg-2">
                        <span className="font-mono text-ok">+{formatPercent(ev.expectedUplift, { digits: 0 })}</span> к выручке по прошлому опыту
                      </p>
                    ) : null}
                    {ev.note ? <p className="mt-1 text-xs text-fg-3">{ev.note}</p> : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <EmptyState icon={<CalendarPlus />} title="Впереди ничего не запланировано" description="Распродажи к праздникам и вайпам приносят до +200 % к выручке дня." />
          )}
        </aside>
      </div>

      <WipeSchedule />

      <NewEventDialog
        open={newParam === "1"}
        onOpenChange={(o) => setNewParam(o ? "1" : null)}
        servers={servers}
        wipes={events.filter((e) => e.kind === "wipe" || e.kind === "season").filter((e) => new Date(e.start).getTime() > NOW_MS)}
        onCreate={(ev) => {
          setEvents((list) => [...list, ev]);
          const idx = MONTHS.findIndex((mm) => {
            const d = new Date(dayIdx(ev.start) * DAY);
            return d.getUTCFullYear() === mm.y && d.getUTCMonth() === mm.m;
          });
          if (idx >= 0) setMonth(idx);
          setNewParam(null);
          toast.success("Акция добавлена в календарь", {
            description: `${ev.title} · ${eventRange(ev)}${ev.autoStart ? " · запустится сама" : ""}`,
          });
        }}
      />
    </>
  );
}

function WeekRow({
  start,
  first,
  last,
  events,
  serverName,
  onAuto,
}: {
  start: number;
  first: number;
  last: number;
  events: CalEvent[];
  serverName: Map<string, string>;
  onAuto: (id: string, v: boolean) => void;
}) {
  const { placed, hidden, lanes } = layoutWeek(start, events, 3);
  const overflow = hidden.some((h) => h.length > 0);
  return (
    <div
      className="relative grid grid-cols-7 border-b border-line-soft last:border-b-0"
      // a row of its own for «+N», under the bars — never drawn on top of an event
      style={{ gridTemplateRows: `28px repeat(${lanes}, 22px) ${overflow ? "22px " : ""}minmax(8px, 1fr)`, minHeight: 96 }}
    >
      {Array.from({ length: 7 }, (_, i) => {
        const idx = start + i;
        const inMonth = idx >= first && idx <= last;
        const today = idx === TODAY;
        return (
          <div
            key={idx}
            style={{ gridColumn: i + 1, gridRow: "1 / -1" }}
            className={cn(
              "relative flex flex-col justify-between border-line-soft px-1.5 pt-1.5 pb-1 sm:px-2",
              i > 0 && "border-l",
              !inMonth && "bg-[repeating-linear-gradient(135deg,transparent_0,transparent_6px,rgb(148_166_204/0.025)_6px,rgb(148_166_204/0.025)_7px)]",
              today && "bg-azure-500/[0.06] shadow-[inset_0_2px_0_var(--color-azure-400)]",
            )}
          >
            <span className="flex items-center gap-1.5">
              <span
                className={cn(
                  "inline-flex h-5 min-w-5 items-center justify-center rounded-sm px-1 font-mono text-[11.5px] nums",
                  today ? "bg-azure-500 font-semibold text-white" : inMonth ? (i >= 5 ? "text-fg-3" : "text-fg-2") : "text-fg-4",
                )}
              >
                {dom(idx)}
              </span>
              {today ? <span className="hidden text-[10.5px] text-azure-300 md:inline">сегодня</span> : null}
            </span>
          </div>
        );
      })}
      {placed.map((s) => (
        <EventBar key={`${s.ev.id}-${start}`} seg={s} serverName={serverName} onAuto={onAuto} />
      ))}
      {hidden.map((list, i) =>
        list.length ? (
          <MoreButton key={`more-${start + i}`} day={start + i} col={i} row={lanes + 2} events={list} serverName={serverName} onAuto={onAuto} />
        ) : null,
      )}
    </div>
  );
}

/** «+N» for events that didn't fit the day — opens the list of what's hidden. */
function MoreButton({
  day,
  col,
  row,
  events,
  serverName,
  onAuto,
}: {
  day: number;
  col: number;
  row: number;
  events: CalEvent[];
  serverName: Map<string, string>;
  onAuto: (id: string, v: boolean) => void;
}) {
  const label = `Ещё ${events.length} ${plural(events.length, ["событие", "события", "событий"])} · ${formatDate(day * DAY, { year: false })}`;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          style={{ gridColumn: col + 1, gridRow: row }}
          aria-label={label}
          className="relative z-10 mx-0.5 my-px justify-self-start rounded-[4px] px-1.5 font-mono text-[10.5px] text-fg-3 transition-colors hover:bg-white/[0.06] hover:text-fg data-[state=open]:bg-white/[0.06] data-[state=open]:text-fg"
        >
          +{events.length}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-2">
        <p className="label-mono px-1.5 pt-1 pb-2 text-[10px] text-fg-4">{formatDate(day * DAY, { year: false })} · ещё</p>
        <ul className="space-y-1">
          {events.map((ev) => (
            <li key={ev.id} className="rounded-md px-1.5 py-1.5 hover:bg-white/[0.03]">
              <p className="flex items-center gap-2 text-[13px] text-fg">
                <Swatch ev={ev} />
                <span className="min-w-0 truncate">{ev.demo ? `Rust · ${ev.title}` : ev.title}</span>
              </p>
              <p className="mt-0.5 pl-[22px] font-mono text-[11px] text-fg-3">
                {eventRange(ev)}
                {ev.serverIds?.length ? ` · ${ev.serverIds.map((s) => serverName.get(s) ?? s).join(", ")}` : ""}
              </p>
              {!ev.demo ? (
                <label className="mt-1 flex items-center justify-between gap-3 pl-[22px] text-[12px] text-fg-3">
                  Автозапуск
                  <Switch size="sm" checked={ev.autoStart} onCheckedChange={(v) => onAuto(ev.id, v)} aria-label={`Автозапуск: ${ev.title}`} />
                </label>
              ) : null}
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

function EventBar({ seg, serverName, onAuto }: { seg: Seg; serverName: Map<string, string>; onAuto: (id: string, v: boolean) => void }) {
  const { ev } = seg;
  const tone = calendarKindMeta[ev.kind].tone;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          style={{ gridColumn: `${seg.from + 1} / ${seg.to + 2}`, gridRow: seg.lane + 2 }}
          className={cn(
            "relative z-10 mx-0.5 my-px flex min-w-0 items-center gap-1 overflow-hidden rounded-[4px] px-1.5 text-left text-[10.5px] font-medium whitespace-nowrap transition-colors sm:text-[11px]",
            ev.demo ? demoBar : kindBar[ev.kind],
            seg.contL && "ml-0 rounded-l-none",
            seg.contR && "mr-0 rounded-r-none",
          )}
          aria-label={`${ev.title}, ${eventRange(ev)}`}
        >
          {ev.discountPct && !seg.contL && !ev.title.includes("%") ? (
            <span className="font-mono opacity-80">−{formatPercent(ev.discountPct, { digits: 0 })}</span>
          ) : null}
          <span className="truncate">{ev.demo ? `Rust · ${ev.title}` : ev.title}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80">
        <div className="flex items-center gap-2">
          <Badge tone={tone}>{calendarKindMeta[ev.kind].label}</Badge>
          {ev.demo ? <Badge tone="outline">пример · Kraken Rust</Badge> : null}
        </div>
        <p className="mt-2 text-[14px] leading-snug font-medium text-fg">{ev.title}</p>
        <p className="mt-1 font-mono text-[12px] text-fg-3">{eventRange(ev)}</p>
        <dl className="mt-3 space-y-1.5 text-[12.5px]">
          <div className="flex justify-between gap-3">
            <dt className="text-fg-3">Серверы</dt>
            <dd className="text-right text-fg-2">{ev.serverIds?.length ? ev.serverIds.map((s) => serverName.get(s) ?? s).join(", ") : "Все"}</dd>
          </div>
          {ev.discountPct ? (
            <div className="flex justify-between gap-3">
              <dt className="text-fg-3">Скидка</dt>
              <dd className="font-mono text-ice-300">−{formatPercent(ev.discountPct, { digits: 0 })}</dd>
            </div>
          ) : null}
          {ev.expectedUplift ? (
            <div className="flex justify-between gap-3">
              <dt className="text-fg-3">Ожидаемо</dt>
              <dd className="font-mono text-ok">+{formatPercent(ev.expectedUplift, { digits: 0 })} к выручке</dd>
            </div>
          ) : null}
        </dl>
        {ev.note ? <p className="mt-3 rounded-md bg-white/[0.03] px-2.5 py-2 text-xs text-fg-2">{ev.note}</p> : null}
        {!ev.demo ? (
          <label className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3 text-[12.5px] text-fg-2">
            Автозапуск скидок и анонсов
            <Switch size="sm" checked={ev.autoStart} onCheckedChange={(v) => onAuto(ev.id, v)} />
          </label>
        ) : (
          <p className="mt-3 border-t border-line pt-3 text-xs text-fg-3">Так выглядит еженедельный цикл: вайп каждый четверг в 18:00, глобальный — в первый четверг месяца.</p>
        )}
      </PopoverContent>
    </Popover>
  );
}

/* ───────────── Wipe schedule ───────────── */

const CYCLES = [
  { server: "Анархия", cycle: "Сезон раз в 2 месяца", next: "01.12, 12:00", detail: "Карта и экономика с нуля, привилегии «до вайпа» сгорают", tone: "ice" as const },
  { server: "Выживание", cycle: "Без вайпов", next: "—", detail: "Обновление до 1.21.5 — 14.11, выдача копится в очереди", tone: "neutral" as const },
  { server: "SkyBlock", cycle: "Сезоны по готовности", next: "12.12, 16:00", detail: "Сезон «Айсберг», острова переносятся в архив", tone: "neutral" as const },
  { server: "Kraken Rust · пример", cycle: "Каждый четверг 18:00", next: "12.11, 18:00", detail: "Глобальный (карта + чертежи) — первый четверг месяца, след. 03.12", tone: "ice" as const },
];

const ACTIONS = [
  { id: "announce", icon: Megaphone, title: "За 2 ч до вайпа — анонс в Telegram и чате", detail: "«Через 2 часа вайп Анархии. Привилегии со скидкой — с 12:00»" },
  { id: "sale", icon: Percent, title: "Первые 6 ч — скидка 20 % на привилегии", detail: "Цены на витрине и в /donate меняются в момент вайпа и возвращаются сами" },
  { id: "expire", icon: TimerReset, title: "Привилегии «до вайпа» истекают в момент вайпа", detail: "Команды снятия уходят на сервер сразу после рестарта" },
];

function WipeSchedule() {
  const [on, setOn] = React.useState<Record<string, boolean>>({ announce: true, sale: true, expire: true });
  return (
    <section className="mt-4 overflow-hidden rounded-xl border border-line bg-surface shadow-raise">
      <header className="flex flex-wrap items-end justify-between gap-2 border-b border-line px-4 py-3 sm:px-5">
        <div>
          <h2 className="text-[15px] font-semibold tracking-[-0.015em] text-fg">Расписание вайпов и сезонов</h2>
          <p className="text-[12.5px] text-fg-3">Акции привязываются к циклу сервера, а не к датам — после переноса вайпа всё сдвинется само</p>
        </div>
        <Link href="/dashboard/servers" className="inline-flex items-center gap-1 text-xs text-azure-300 hover:text-azure-200">
          <Link2 className="size-3.5" /> Настроить цикл сервера
        </Link>
      </header>
      <div className="grid lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <ul className="divide-y divide-line-soft lg:border-r lg:border-line-soft">
          {CYCLES.map((c) => (
            <li key={c.server} className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-0.5 px-4 py-3 sm:px-5">
              <p className="flex items-center gap-2 text-[13.5px] font-medium text-fg">
                <span className={cn("size-1.5 rounded-full", toneDot[c.tone])} />
                {c.server}
              </p>
              <p className="row-span-2 self-center text-right font-mono text-[12px] text-fg-2 nums">
                <span className="block text-[10px] tracking-[0.06em] text-fg-4 uppercase">след.</span>
                {c.next}
              </p>
              <p className="pl-3.5 text-xs text-fg-3">
                <span className="text-fg-2">{c.cycle}</span> · {c.detail}
              </p>
            </li>
          ))}
        </ul>
        <div className="border-t border-line-soft px-4 py-4 sm:px-5 lg:border-t-0">
          <p className="label-mono mb-3 text-fg-3">Автоматические действия · вайп Анархии</p>
          <ul className="space-y-3">
            {ACTIONS.map((a) => (
              <li key={a.id} className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-2.5">
                  <a.icon className="mt-0.5 size-4 shrink-0 text-ice-300" />
                  <div>
                    <p className="text-[13px] text-fg">{a.title}</p>
                    <p className="mt-0.5 text-xs text-fg-3">{a.detail}</p>
                  </div>
                </div>
                <Switch
                  size="sm"
                  checked={on[a.id]}
                  onCheckedChange={(v) => {
                    setOn((s) => ({ ...s, [a.id]: v }));
                    toast(v ? "Действие включено" : "Действие выключено", { description: a.title });
                  }}
                  aria-label={a.title}
                  className="mt-1"
                />
              </li>
            ))}
          </ul>
          <WipeTimeline on={on} />
        </div>
      </div>
    </section>
  );
}

/** −2 ч … вайп … +6 ч on one axis: what fires when. */
function WipeTimeline({ on }: { on: Record<string, boolean> }) {
  const at = (h: number) => `${((h + 2) / 8) * 100}%`;
  return (
    <div className="mt-5 rounded-lg border border-line-soft bg-[#06080c] px-4 pt-4 pb-3" aria-label="Шкала действий вокруг вайпа">
      <div className="relative h-10">
        <div className="absolute top-5 right-0 left-0 h-px bg-line-strong" />
        {on.sale ? (
          <div className="absolute top-[17px] h-[7px] rounded-[2px] bg-azure-500/60 ring-1 ring-azure-400/50" style={{ left: at(0), right: 0 }}>
            <span className="absolute -top-4 right-0 font-mono text-[10px] whitespace-nowrap text-azure-200">−20 % на привилегии</span>
          </div>
        ) : null}
        {on.announce ? (
          <span className="absolute top-[15px] size-[11px] -translate-x-1/2 rounded-full border-2 border-[#06080c] bg-ice-300" style={{ left: at(-2) }}>
            <span className="absolute -top-4 left-0 font-mono text-[10px] whitespace-nowrap text-ice-200">анонс</span>
          </span>
        ) : null}
        {/* the label hangs to the right of the marker, so it never runs into «анонс» on phones */}
        <span className="absolute top-2.5 h-5 w-[2px] -translate-x-1/2 bg-ice-300" style={{ left: at(0) }}>
          <span className="absolute -top-4 left-0 font-mono text-[10px] whitespace-nowrap text-fg">
            вайп{on.expire ? <span className="hidden sm:inline"> · −привилегии</span> : null}
          </span>
        </span>
      </div>
      <div className="relative mt-1 h-4 font-mono text-[10.5px] text-fg-4 nums">
        {[
          { h: -2, t: "10:00" },
          { h: 0, t: "12:00" },
          { h: 3, t: "15:00" },
          { h: 6, t: "18:00" },
        ].map((x) => (
          <span key={x.h} className={cn("absolute", x.h === -2 ? "left-0" : x.h === 6 ? "right-0" : "-translate-x-1/2")} style={x.h === -2 || x.h === 6 ? undefined : { left: at(x.h) }}>
            {x.t}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ───────────── New event ───────────── */

const toInput = (iso: string) => {
  const d = new Date(new Date(iso).getTime() + MSK);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
};
const fromInput = (v: string, end = false) => {
  const [yy, mm, dd] = v.split("-").map(Number);
  return end ? msk(yy, mm, dd, 23, 59) : msk(yy, mm, dd, 0, 0);
};

function NewEventDialog({
  open,
  onOpenChange,
  servers,
  wipes,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  servers: CalServer[];
  wipes: CalEvent[];
  onCreate: (ev: CalEvent) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">{open ? <NewEventForm servers={servers} wipes={wipes} onCreate={onCreate} onCancel={() => onOpenChange(false)} /> : null}</DialogContent>
    </Dialog>
  );
}

function NewEventForm({ servers, wipes, onCreate, onCancel }: { servers: CalServer[]; wipes: CalEvent[]; onCreate: (ev: CalEvent) => void; onCancel: () => void }) {
  const [title, setTitle] = React.useState("");
  const [kind, setKind] = React.useState<CalendarEventKind>("sale");
  const [start, setStart] = React.useState(toInput(new Date(NOW_MS + 7 * DAY).toISOString()));
  const [end, setEnd] = React.useState(toInput(new Date(NOW_MS + 9 * DAY).toISOString()));
  const [srv, setSrv] = React.useState<string[]>([]);
  const [discount, setDiscount] = React.useState("15");
  const [auto, setAuto] = React.useState(true);
  const [bind, setBind] = React.useState("none");
  const [touched, setTouched] = React.useState(false);

  const wipe = wipes.find((w) => w.id === bind);
  const titleErr = title.trim().length < 3 ? "Как акцию увидит команда, например «Неделя кейсов −25 %»" : null;
  const dateErr = !wipe && end < start ? "Конец раньше начала" : null;
  const valid = !titleErr && !dateErr;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!valid) return;
    onCreate({
      id: `ev-new-${title.length}-${start}`,
      title: title.trim(),
      kind,
      start: wipe ? wipe.start : fromInput(start),
      end: wipe ? new Date(new Date(wipe.start).getTime() + 6 * HOUR).toISOString() : fromInput(end, true),
      serverIds: wipe?.serverIds ?? (srv.length ? srv : undefined),
      discountPct: Number(discount) || undefined,
      autoStart: auto,
      note: wipe ? `Привязана к событию «${wipe.title}» — сдвинется вместе с ним` : undefined,
    });
  };

  return (
    <form onSubmit={submit} noValidate>
      <DialogHeader>
        <DialogTitle>Новая акция</DialogTitle>
        <DialogDescription>Скидка включится и выключится сама, анонс уйдёт в Telegram и чат серверов.</DialogDescription>
      </DialogHeader>
      <DialogBody className="max-h-[min(68vh,600px)] space-y-4 overflow-y-auto">
        <Field label="Название" htmlFor="ev-title" error={touched ? titleErr ?? undefined : undefined}>
          <Input id="ev-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Неделя кейсов −25 %" aria-invalid={touched && !!titleErr ? true : undefined} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Тип" htmlFor="ev-kind">
            <Select value={kind} onValueChange={(v) => setKind(v as CalendarEventKind)}>
              <SelectTrigger id="ev-kind">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {KINDS.map((k) => (
                  <SelectItem key={k} value={k}>
                    {calendarKindMeta[k].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Привязать к вайпу" htmlFor="ev-bind" hint={wipe ? `Старт в ${formatTime(wipe.start)}, ${formatDateShort(wipe.start)} · 6 часов` : "Даты сдвинутся вместе с вайпом"}>
            <Select value={bind} onValueChange={setBind}>
              <SelectTrigger id="ev-bind">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Не привязывать</SelectItem>
                {wipes.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Начало" htmlFor="ev-start">
            <Input id="ev-start" type="date" value={wipe ? toInput(wipe.start) : start} min="2026-10-01" max="2027-01-31" onChange={(e) => setStart(e.target.value)} disabled={!!wipe} className="font-mono" />
          </Field>
          <Field label="Конец" htmlFor="ev-end" error={touched ? dateErr ?? undefined : undefined}>
            <Input id="ev-end" type="date" value={wipe ? toInput(wipe.start) : end} min="2026-10-01" max="2027-01-31" onChange={(e) => setEnd(e.target.value)} disabled={!!wipe} className="font-mono" aria-invalid={touched && !!dateErr ? true : undefined} />
          </Field>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Серверы</Label>
          <div className="flex flex-wrap gap-1.5">
            {servers.map((s) => {
              const sel = wipe ? !!wipe.serverIds?.includes(s.id) : srv.includes(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  aria-pressed={sel}
                  disabled={!!wipe}
                  onClick={() => setSrv((list) => (list.includes(s.id) ? list.filter((x) => x !== s.id) : [...list, s.id]))}
                  className={cn(
                    "h-8 rounded-md border px-2.5 text-[13px] transition-colors disabled:opacity-60",
                    sel ? "border-azure-400/50 bg-azure-500/12 text-azure-100" : "border-line text-fg-3 hover:border-line-strong hover:text-fg-2",
                  )}
                >
                  {s.name}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-fg-3">{wipe ? "Сервер берём из вайпа" : srv.length ? "" : "Ничего не выбрано — акция на всех серверах"}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Скидка" htmlFor="ev-discount" hint="Пусто — без скидки, только анонс">
            <Input
              id="ev-discount"
              inputMode="numeric"
              value={discount}
              onChange={(e) => setDiscount(e.target.value.replace(/[^\d]/g, "").slice(0, 2))}
              trailing={<span className="pr-1 font-mono text-xs">%</span>}
            />
          </Field>
          <label className="flex items-center justify-between gap-3 self-end rounded-md border border-line bg-surface-2 px-3 py-2">
            <span>
              <span className="block text-[13px] text-fg-2">Автозапуск</span>
              <span className="block text-[11.5px] text-fg-4">Без ночных ручных включений</span>
            </span>
            <Switch checked={auto} onCheckedChange={setAuto} aria-label="Автозапуск" />
          </label>
        </div>
      </DialogBody>
      <DialogFooter>
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Отмена
        </Button>
        <Button type="submit" variant="primary" size="sm" disabled={touched && !valid}>
          <Plus /> Добавить в календарь
        </Button>
      </DialogFooter>
    </form>
  );
}
