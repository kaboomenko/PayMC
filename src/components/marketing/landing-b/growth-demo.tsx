"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, Clock3, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMoney, formatNumber, formatPercent, plural } from "@/lib/format";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Kbd } from "@/components/ui/kbd";
import { GameViewport } from "./game-viewport";
import { GROWTH_SCENARIOS, type CampaignSummary, type GrowthScenario, type ScenarioId } from "./growth-scenarios";

const byId = (id: ScenarioId) => GROWTH_SCENARIOS.find((s) => s.id === id) ?? GROWTH_SCENARIOS[0];

function marksOf(s: GrowthScenario) {
  const all = [
    ...s.chat.map((l) => l.at),
    s.bossbar?.at,
    s.title?.at,
    s.push?.at,
    s.push?.until,
    s.purchaseAt,
    s.end,
  ].filter((v): v is number => typeof v === "number" && v > 0);
  return [...new Set(all)].sort((a, b) => a - b);
}

/** first moment the campaign itself shows up on screen */
function messageAt(s: GrowthScenario) {
  const firstLine = s.chat.find((l) => l.at > 0)?.at ?? Infinity;
  return Math.min(firstLine, s.bossbar?.at ?? Infinity, s.title?.at ?? Infinity, s.push?.at ?? Infinity);
}

export function GrowthDemo({ campaigns, online }: { campaigns: Record<ScenarioId, CampaignSummary>; online: number }) {
  const reduce = useReducedMotion();
  const [active, setActive] = React.useState<ScenarioId>("cart");
  const [cursor, setCursor] = React.useState(() => byId("cart").poster);
  const timers = React.useRef<number[]>([]);
  const played = React.useRef(false);
  const activeRef = React.useRef<ScenarioId>("cart");
  const rootRef = React.useRef<HTMLDivElement>(null);

  const scenario = byId(active);
  const stats = campaigns[active];

  const clear = React.useCallback(() => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  }, []);

  const play = React.useCallback(
    (id: ScenarioId) => {
      const s = byId(id);
      clear();
      if (reduce) {
        setCursor(s.end);
        return;
      }
      setCursor(0);
      for (const m of marksOf(s)) timers.current.push(window.setTimeout(() => setCursor(m), m + 120));
    },
    [clear, reduce],
  );

  const select = (value: string) => {
    const id = value as ScenarioId;
    activeRef.current = id;
    played.current = true;
    setActive(id);
    play(id);
  };

  React.useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !played.current) {
          played.current = true;
          timers.current.push(window.setTimeout(() => play(activeRef.current), 400));
        }
      },
      { threshold: 0.55 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [play]);

  React.useEffect(() => clear, [clear]);

  const msgAt = messageAt(scenario);
  const bought = cursor >= scenario.purchaseAt;
  const rate = stats.reached ? (stats.converted / stats.reached) * 100 : 0;

  return (
    <div
      ref={rootRef}
      className="overflow-hidden rounded-xl border border-line-strong bg-surface shadow-[0_30px_80px_-40px_rgb(0_0_0/0.9)]"
    >
      <Tabs value={active} onValueChange={select}>
        <div className="flex items-center justify-between gap-3 border-b border-line px-2 py-2 sm:px-3">
          <div className="scrollbar-none -my-1 min-w-0 overflow-x-auto py-1">
            <TabsList variant="pill" aria-label="Сценарий кампании">
              {GROWTH_SCENARIOS.map((s) => (
                <TabsTrigger key={s.id} value={s.id} className="px-2.5">
                  {s.tab}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            <span className="hidden items-center gap-1 text-[11.5px] text-fg-4 xl:flex">
              <Kbd>←</Kbd>
              <Kbd>→</Kbd>
              <span className="ml-1">сценарий</span>
            </span>
            <button
              type="button"
              onClick={() => play(active)}
              className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[12px] text-fg-3 transition-colors hover:bg-white/[0.05] hover:text-fg"
              aria-label="Повторить сценарий"
            >
              <RotateCcw className="size-3.5" />
              <span className="hidden sm:inline">Повторить</span>
            </button>
          </div>
        </div>

        <TabsContent value={active} className="grid lg:grid-cols-[minmax(0,1fr)_336px]">
          <div className="p-2 sm:p-3">
            <GameViewport scenario={scenario} cursor={cursor} online={online} />
          </div>

          {/* campaign panel */}
          <aside className="flex flex-col border-t border-line lg:border-t-0 lg:border-l">
            <div className="p-4 sm:p-5">
              <p className="label-mono flex items-center gap-2 text-fg-3">
                Кампания
                <span className="inline-flex items-center gap-1 text-ok">
                  <span className="size-1.5 rounded-full bg-ok" /> активна
                </span>
              </p>
              <h3 className="mt-2 text-[17px] font-semibold tracking-[-0.015em] text-fg">{stats.name}</h3>

              <ol className="mt-4 space-y-0">
                <Step state="done" label="Условие" last={false}>
                  {stats.trigger}
                </Step>
                <Step state={cursor >= msgAt ? "done" : "wait"} label="Сообщение" last={false}>
                  {stats.channels.join(" · ")}
                  {stats.offer ? <span className="text-fg-4"> · {stats.offer}</span> : null}
                </Step>
                <Step state={bought ? "done" : cursor >= msgAt ? "active" : "wait"} label="Покупка" last>
                  <AnimatePresence mode="wait" initial={false}>
                    {bought ? (
                      <motion.span key="b" initial={{ opacity: 0, y: 3 }} animate={{ opacity: 1, y: 0 }} className="text-fg-2">
                        {scenario.conversion.player} · {scenario.conversion.product} ·{" "}
                        <span className="font-mono text-fg nums">{formatMoney(scenario.conversion.amount)}</span>
                      </motion.span>
                    ) : (
                      <motion.span key="w" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-fg-4">
                        ждём игрока…
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Step>
              </ol>
            </div>

            <div className="mt-auto border-t border-line-soft p-4 sm:p-5">
              <p className="label-mono text-fg-4">За 30 дней</p>
              <p className="mt-2 flex flex-wrap items-baseline gap-x-2 font-mono text-[22px] font-medium tracking-[-0.02em] text-fg nums">
                {formatNumber(stats.reached)}
                <span className="text-fg-4">→</span>
                {formatNumber(stats.converted)}
              </p>
              <p className="text-[12px] text-fg-3">
                {plural(stats.reached, ["игрок получил", "игрока получили", "игроков получили"])} сообщение →{" "}
                {plural(stats.converted, ["покупка", "покупки", "покупок"])}
              </p>
              <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-line bg-line">
                <div className="bg-surface-2 px-3 py-2.5">
                  <dt className="text-[11px] text-fg-3">Конверсия</dt>
                  <dd className="mt-0.5 font-mono text-[15px] font-medium text-fg nums">{formatPercent(rate)}</dd>
                </div>
                <div className="bg-surface-2 px-3 py-2.5">
                  <dt className="text-[11px] text-fg-3">Выручка</dt>
                  <dd className="mt-0.5 font-mono text-[15px] font-medium text-ice-300 nums">{formatMoney(stats.revenue)}</dd>
                </div>
              </dl>
              <Funnel reached={stats.reached} clicked={stats.clicked} converted={stats.converted} />
            </div>
          </aside>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Step({
  state,
  label,
  last,
  children,
}: {
  state: "done" | "active" | "wait";
  label: string;
  last: boolean;
  children: React.ReactNode;
}) {
  return (
    <li className="relative grid grid-cols-[18px_1fr] gap-x-2.5 pb-3 last:pb-0">
      {!last ? <span aria-hidden className="absolute top-[20px] bottom-0 left-[8.5px] w-px bg-line" /> : null}
      <span
        className={cn(
          "relative z-10 mt-px flex size-[18px] items-center justify-center rounded-full border transition-colors duration-200",
          state === "done" && "border-ok/30 bg-ok-soft text-ok",
          state === "active" && "border-ice-400/40 bg-ice-400/10 text-ice-300",
          state === "wait" && "border-line bg-surface-2 text-fg-4",
        )}
      >
        {state === "done" ? <Check className="size-2.5" strokeWidth={3} /> : <Clock3 className="size-2.5" />}
      </span>
      <div className="min-w-0">
        <p className="text-[12px] font-medium text-fg">{label}</p>
        <p className="text-[12.5px] leading-snug text-fg-3">{children}</p>
      </div>
    </li>
  );
}

function Funnel({ reached, clicked, converted }: { reached: number; clicked: number; converted: number }) {
  const rows = [
    { label: "Увидели", value: reached },
    { label: "Открыли магазин", value: clicked },
    { label: "Купили", value: converted },
  ];
  return (
    <ul className="mt-4 space-y-1.5" aria-label="Воронка кампании">
      {rows.map((r, i) => {
        const w = reached ? (r.value / reached) * 100 : 0;
        return (
          <li key={r.label} className="grid grid-cols-[104px_1fr_52px] items-center gap-2 text-[11.5px]">
            <span className="truncate text-fg-3">{r.label}</span>
            <span className="h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
              <span
                className={cn("block h-full rounded-full", i === 2 ? "bg-ice-400" : "bg-azure-500/80")}
                style={{ width: `${Math.max(2, w)}%` }}
              />
            </span>
            <span className="text-right font-mono text-fg-2 nums">{formatNumber(r.value)}</span>
          </li>
        );
      })}
    </ul>
  );
}
