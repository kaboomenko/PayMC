"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Landmark, RotateCw, ShieldCheck, UserRound, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate, formatMoney, formatNumber, formatTime, formatWeekday, pluralize, typo } from "@/lib/format";
import { Avatar } from "@/components/ui/avatar";
import { Segmented } from "@/components/ui/segmented";
import { Switch } from "@/components/ui/switch";
import { CountUp } from "./count-up";
import type { PayoutDay } from "./money-data";

export interface SplitMember {
  name: string;
  role: string;
  pct: number;
  destination: string;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const dayNum = (iso: string) => formatDate(iso, { year: false }).split(" ")[0];

/** Bento cell: hairline card with a small header. Sizes differ per cell. */
export function Cell({
  title,
  kicker,
  aside,
  children,
  className,
}: {
  title: string;
  kicker: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 flex-col rounded-xl border border-line bg-surface p-4 shadow-raise sm:p-5", className)}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="label-mono text-[10px] text-fg-4">{kicker}</p>
          <h3 className="mt-1.5 text-[16px] font-semibold tracking-[-0.01em] text-fg">{title}</h3>
        </div>
        {aside ? <div className="shrink-0">{aside}</div> : null}
      </div>
      {children}
    </div>
  );
}

export function MoneyBento({ members, week, receipt }: { members: SplitMember[]; week: PayoutDay[]; receipt: React.ReactNode }) {
  // yesterday's payout (the last one that has fully landed) is selected by default
  const [selected, setSelected] = React.useState(Math.max(0, week.length - 2));
  const [failover, setFailover] = React.useState(false);
  const day = week[selected];
  const rerouteMin = week.find((d) => d.rerouteMin != null)?.rerouteMin ?? 40;

  const pick = (i: number) => {
    setSelected(i);
    setFailover(week[i].status === "rerouted");
  };

  if (!day) return null;

  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-12">
      <PayoutsCell className="md:col-span-2 lg:col-span-7" week={week} selected={selected} onSelect={pick} />
      <RouteCell
        className="lg:col-span-5"
        failover={failover}
        onFailover={setFailover}
        rerouteMin={rerouteMin}
        shares={members.map((m) => m.pct).join(" / ")}
      />
      <SplitCell className="lg:col-span-4" members={members} day={day} />
      <Cell kicker="Налоги" title="Чеки самозанятого — сами" className="lg:col-span-5">
        {receipt}
      </Cell>
      <HoldCell className="md:col-span-2 lg:col-span-3" />
    </div>
  );
}

/* ───────────── (a) Payout week ───────────── */

function PayoutsCell({
  week,
  selected,
  onSelect,
  className,
}: {
  week: PayoutDay[];
  selected: number;
  onSelect: (i: number) => void;
  className?: string;
}) {
  const max = Math.max(...week.map((d) => d.amount));
  const total = week.reduce((a, d) => a + d.amount, 0);
  const day = week[selected];
  const tabsRef = React.useRef<HTMLDivElement>(null);

  const onKey = (e: React.KeyboardEvent) => {
    const n = week.length;
    let next = selected;
    if (e.key === "ArrowRight") next = Math.min(n - 1, selected + 1);
    else if (e.key === "ArrowLeft") next = Math.max(0, selected - 1);
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = n - 1;
    else return;
    e.preventDefault();
    onSelect(next);
    tabsRef.current?.querySelectorAll<HTMLButtonElement>("[role=tab]")[next]?.focus();
  };

  return (
    <Cell
      kicker="Выплаты"
      title="Каждый день в 12:00"
      className={className}
      aside={
        <p className="text-right font-mono text-[11px] text-fg-4">
          за {pluralize(week.length, ["день", "дня", "дней"])}
          <span className="mt-0.5 block text-[14px] text-fg nums">{formatMoney(total)}</span>
        </p>
      }
    >
      <div ref={tabsRef} role="tablist" aria-label="Выплаты за неделю" onKeyDown={onKey} className="grid grid-cols-7 gap-1 sm:gap-1.5">
        {week.map((d, i) => {
          const active = i === selected;
          const h = Math.max(18, Math.round((d.amount / max) * 100));
          return (
            <button
              key={d.id}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls="payout-detail"
              aria-label={`${cap(formatWeekday(d.at))}, ${formatDate(d.at, { year: false })}: ${formatMoney(d.amount)}`}
              tabIndex={active ? 0 : -1}
              onClick={() => onSelect(i)}
              className={cn(
                "group flex min-w-0 flex-col items-center gap-1.5 rounded-md px-0.5 pt-2 pb-1.5 transition-colors duration-150",
                active ? "bg-white/[0.05]" : "hover:bg-white/[0.03]",
              )}
            >
              <span className={cn("hidden font-mono text-[10.5px] nums sm:block", active ? "text-fg" : "text-fg-4")}>
                {formatNumber(d.amount)}
              </span>
              <span className="flex h-[92px] w-full items-end justify-center sm:h-[104px]">
                <span
                  className={cn(
                    "relative w-[min(28px,70%)] rounded-t-[3px] transition-colors duration-200",
                    d.status === "processing"
                      ? "bg-[repeating-linear-gradient(135deg,rgb(85_207_255/0.35)_0_3px,transparent_3px_6px)] ring-1 ring-ice-400/40 ring-inset"
                      : d.status === "rerouted"
                        ? active
                          ? "bg-ice-400"
                          : "bg-ice-400/40 group-hover:bg-ice-400/60"
                        : active
                          ? "bg-azure-400"
                          : "bg-surface-4 group-hover:bg-azure-500/40",
                  )}
                  style={{ height: `${h}%` }}
                >
                  {d.status === "rerouted" ? (
                    <span aria-hidden className="absolute -top-2.5 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-bad" />
                  ) : null}
                </span>
              </span>
              <span className={cn("font-mono text-[10.5px] whitespace-nowrap", active ? "text-fg-2" : "text-fg-4")}>
                {formatWeekday(d.at)} {dayNum(d.at)}
              </span>
              <StatusGlyph status={d.status} />
            </button>
          );
        })}
      </div>

      <div id="payout-detail" role="tabpanel" aria-label="Детали выплаты" className="mt-3 rounded-lg border border-line-soft bg-canvas/60 px-3.5 py-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <p className="text-[13px] text-fg">
            {cap(formatWeekday(day.at))}, {formatDate(day.at, { year: false })} ·{" "}
            <CountUp value={day.amount} className="font-mono nums" />
          </p>
          <p className="text-[11.5px] text-fg-4">за продажи {formatDate(day.salesDay, { year: false })}</p>
        </div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.ol
            key={day.id}
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            className="mt-2 space-y-1 font-mono text-[11.5px] leading-[1.55]"
          >
            {day.log.map((l, i) => (
              <li key={i} className="grid grid-cols-[62px_minmax(0,1fr)] gap-2">
                <span className="text-fg-4 nums">{formatTime(l.at, true)}</span>
                <span
                  className={cn(
                    l.tone === "ok" && "text-ok",
                    l.tone === "bad" && "text-bad",
                    l.tone === "ice" && "text-ice-300",
                    l.tone === "muted" && "text-fg-2",
                  )}
                >
                  {typo(l.text)}
                </span>
              </li>
            ))}
          </motion.ol>
        </AnimatePresence>
      </div>

      <ul className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-4 text-[11.5px] text-fg-4">
        <li className="flex items-center gap-1.5">
          <Check aria-hidden className="size-3 text-ok/80" /> зачислено
        </li>
        <li className="flex items-center gap-1.5">
          <RotateCw aria-hidden className="size-3 text-ice-300" /> через резервный банк
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="size-1.5 rounded-full bg-ice-400" /> в пути
        </li>
        <li className="sm:ml-auto">Выходные и праздники — как будни</li>
      </ul>
    </Cell>
  );
}

function StatusGlyph({ status }: { status: PayoutDay["status"] }) {
  if (status === "processing") {
    return (
      <span className="flex h-3.5 items-center" aria-hidden>
        <span className="size-1.5 animate-pulse rounded-full bg-ice-400" />
      </span>
    );
  }
  if (status === "rerouted") return <RotateCw aria-hidden className="size-3.5 text-ice-300" />;
  return <Check aria-hidden className="size-3.5 text-ok/80" />;
}

/* ───────────── (b) Money route ───────────── */

const FLOW_CSS = `@keyframes paymc-wire{to{stroke-dashoffset:-16}}.paymc-wire{animation:paymc-wire .9s linear infinite}`;

function Wire({ d, state, className }: { d: string; state: "active" | "idle" | "down"; className?: string }) {
  return (
    <path
      d={d}
      fill="none"
      vectorEffect="non-scaling-stroke"
      strokeWidth={state === "active" ? 1.5 : 1}
      strokeDasharray={state === "active" ? "5 3" : "2 4"}
      className={cn(
        "transition-[stroke] duration-200",
        state === "active" && "paymc-wire stroke-azure-400",
        state === "idle" && "stroke-line-strong",
        state === "down" && "stroke-bad/60",
        className,
      )}
    />
  );
}

function FlowNode({
  title,
  meta,
  state = "active",
  badge,
  icon: Icon,
}: {
  title: string;
  meta: string;
  state?: "active" | "standby" | "down";
  badge?: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div
      className={cn(
        "relative rounded-lg border px-3 py-2 transition-colors duration-200",
        state === "active" && "border-line-strong bg-surface-2",
        state === "standby" && "border-dashed border-line-strong bg-transparent",
        state === "down" && "border-bad/30 bg-bad-soft",
      )}
    >
      <p className={cn("flex min-w-0 items-center gap-1.5 text-[12.5px] font-medium", state === "standby" ? "text-fg-3" : "text-fg")}>
        <Icon className={cn("size-3.5 shrink-0", state === "down" ? "text-bad" : state === "standby" ? "text-fg-4" : "text-azure-300")} />
        <span className="truncate">{title}</span>
      </p>
      {/* the status badge sits on the meta line, so a narrow node never clips its title */}
      <div className="mt-0.5 flex items-baseline justify-between gap-2">
        <p className="min-w-0 truncate font-mono text-[10.5px] text-fg-4">{meta}</p>
        {badge ? <span className="shrink-0">{badge}</span> : null}
      </div>
    </div>
  );
}

function RouteCell({
  failover,
  onFailover,
  rerouteMin,
  shares,
  className,
}: {
  failover: boolean;
  onFailover: (v: boolean) => void;
  rerouteMin: number;
  shares: string;
  className?: string;
}) {
  return (
    <Cell
      kicker="Маршрут денег"
      title="Резервный банк включается сам"
      className={className}
      aside={
        <label className="flex cursor-pointer items-center gap-2 text-[11.5px] text-fg-3 select-none">
          <Switch size="sm" checked={failover} onCheckedChange={onFailover} aria-label="Сбой основного банка" />
          <span className="whitespace-nowrap">сбой банка</span>
        </label>
      }
    >
      <style>{FLOW_CSS}</style>
      <div className="flex flex-1 flex-col justify-center">
        <FlowNode icon={UserRound} title="Игрок" meta="СБП · Мир · SberPay · T-Pay · ЮMoney" />
        <svg aria-hidden viewBox="0 0 100 20" preserveAspectRatio="none" className="h-5 w-full">
          <Wire d="M50 0 V20" state="active" />
        </svg>
        <FlowNode icon={Landmark} title="Банк-партнёр" meta="мультирасчёты · номинальный счёт" />
        <svg aria-hidden viewBox="0 0 100 28" preserveAspectRatio="none" className="h-7 w-full">
          <Wire d="M50 0 V14 H25 V28" state={failover ? "down" : "active"} />
          <Wire d="M50 0 V14 H75 V28" state={failover ? "active" : "idle"} />
        </svg>
        <div className="grid grid-cols-2">
          <div className="pr-1.5">
            <FlowNode
              icon={Landmark}
              title="Основной"
              meta="банк выплат"
              state={failover ? "down" : "active"}
              badge={failover ? <span className="font-mono text-[10px] text-bad">отклонил</span> : null}
            />
          </div>
          <div className="pl-1.5">
            <FlowNode
              icon={Landmark}
              title="Резервный"
              meta="второй банк"
              state={failover ? "active" : "standby"}
              badge={<span className={cn("font-mono text-[10px]", failover ? "text-ice-300" : "text-fg-4")}>{failover ? `+${rerouteMin}\u00a0мин` : "ждёт"}</span>}
            />
          </div>
        </div>
        <svg aria-hidden viewBox="0 0 100 28" preserveAspectRatio="none" className="h-7 w-full">
          <Wire d="M25 0 V14 H50 V28" state={failover ? "idle" : "active"} />
          <Wire d="M75 0 V14 H50 V28" state={failover ? "active" : "idle"} />
        </svg>
        <FlowNode icon={Users} title="Вы и команда" meta={`карта или СБП · доли ${shares}`} />
      </div>
      <p className="mt-4 flex items-start gap-2 border-t border-line-soft pt-3 text-[12.5px] leading-snug text-fg-3">
        <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-ok" />
        <span>
          <span className="text-fg-2">PayMC не держит деньги на своём счёте.</span> Платёж идёт через номинальный счёт банка-партнёра и
          уходит вам напрямую.
        </span>
      </p>
    </Cell>
  );
}

/* ───────────── (c) Team split ───────────── */

const SPLIT_TONES = ["bg-azure-500", "bg-ice-400", "bg-azure-200"];

function SplitCell({ members, day, className }: { members: SplitMember[]; day: PayoutDay; className?: string }) {
  const [hover, setHover] = React.useState<number | null>(null);
  return (
    <Cell
      kicker="Сплит команды"
      title="Каждому — своя доля"
      className={className}
      aside={
        <p className="text-right font-mono text-[11px] text-fg-4">
          выплата
          <CountUp value={day.amount} className="mt-0.5 block text-[14px] text-fg nums" />
        </p>
      }
    >
      <div className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full" aria-hidden>
        {members.map((m, i) => (
          <span
            key={m.name}
            className={cn("h-full transition-opacity duration-150", SPLIT_TONES[i % SPLIT_TONES.length], hover != null && hover !== i && "opacity-30")}
            style={{ width: `${m.pct}%` }}
          />
        ))}
      </div>
      <ul className="mt-4 divide-y divide-line-soft">
        {members.map((m, i) => (
          <li
            key={m.name}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
          >
            <span className="relative">
              <Avatar name={m.name} size={30} />
              <span aria-hidden className={cn("absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full ring-2 ring-surface", SPLIT_TONES[i % SPLIT_TONES.length])} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] text-fg">{m.name}</span>
              <span className="block truncate font-mono text-[10.5px] text-fg-4">
                {m.role} · {m.destination}
              </span>
            </span>
            <span className="text-right">
              <CountUp value={day.splits[i] ?? 0} className="block font-mono text-[13px] text-fg nums" />
              <span className="font-mono text-[10.5px] text-fg-4 nums">{m.pct} %</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-auto pt-4 text-[12px] leading-snug text-fg-4">
        Выберите другой день в выплатах — суммы пересчитаются. Доли меняются в настройках команды.
      </p>
    </Cell>
  );
}

/* ───────────── (e) Hold ───────────── */

type Rail = "sbp" | "card";

const HOLD: Record<Rail, { steps: { t: string; label: string; tone: "fg" | "ice" | "ok" }[]; reserve: string }> = {
  sbp: {
    steps: [
      { t: "чт 5 ноя, 14:05", label: "Оплата по СБП", tone: "fg" },
      { t: "сразу", label: "Без холда — деньги доступны", tone: "ice" },
      { t: "пт 6 ноя, 12:00", label: "В ближайшей выплате", tone: "ok" },
    ],
    reserve: "Резерва нет: чарджбэков по СБП не бывает.",
  },
  card: {
    steps: [
      { t: "чт 5 ноя, 14:05", label: "Оплата картой", tone: "fg" },
      { t: "24 ч", label: "Холд до пт 6 ноя, 14:05", tone: "ice" },
      { t: "сб 7 ноя, 12:00", label: "В выплате после холда", tone: "ok" },
    ],
    reserve: "Небольшой резерв на чарджбэки — только с карточных платежей.",
  },
};

function HoldCell({ className }: { className?: string }) {
  const [rail, setRail] = React.useState<Rail>("sbp");
  const data = HOLD[rail];
  return (
    <Cell kicker="Холд честно" title="Когда придут деньги" className={className}>
      <fieldset className="self-start">
        <legend className="sr-only">Способ оплаты</legend>
        <Segmented
          size="xs"
          value={rail}
          onChange={setRail}
          options={[
            { value: "sbp", label: "СБП · сразу" },
            { value: "card", label: "Карта · 24 ч" },
          ]}
        />
      </fieldset>
      <AnimatePresence mode="wait" initial={false}>
        <motion.ol
          key={rail}
          initial={{ opacity: 0, y: 3 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          className="mt-4 mb-4"
        >
          {data.steps.map((s, i) => (
            <li key={s.label} className="relative grid grid-cols-[14px_minmax(0,1fr)] gap-x-2.5 pb-3 last:pb-0">
              {i < data.steps.length - 1 ? (
                <span
                  aria-hidden
                  className={cn(
                    "absolute top-[14px] bottom-0 left-[6.5px] w-px",
                    rail === "card" && i === 1 ? "bg-[repeating-linear-gradient(180deg,rgb(85_207_255/0.6)_0_3px,transparent_3px_6px)]" : "bg-line-strong",
                  )}
                />
              ) : null}
              <span
                aria-hidden
                className={cn(
                  "relative z-10 mt-[3px] size-3.5 rounded-full border-2 border-surface",
                  s.tone === "fg" && "bg-fg-3",
                  s.tone === "ice" && "bg-ice-400",
                  s.tone === "ok" && "bg-ok",
                )}
              />
              <span className="min-w-0">
                <span className="block font-mono text-[11px] text-fg-4 nums">{s.t}</span>
                <span className="block text-[12.5px] leading-snug text-fg-2">{s.label}</span>
              </span>
            </li>
          ))}
        </motion.ol>
      </AnimatePresence>
      <p className="mt-auto border-t border-line-soft pt-3 text-[12px] leading-snug text-fg-3">{data.reserve}</p>
    </Cell>
  );
}
