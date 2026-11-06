"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, Clock3, CornerDownRight, LogIn, RotateCcw, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/format";
import { Switch } from "@/components/ui/switch";
import { SCENARIOS, buildSteps, fillTemplate, type ScenarioStep } from "./scenarios";

type Phase = "idle" | "running" | "done";

const STEP_GAP = 300; // ms between revealed steps (time-compressed animation)

export function DeliverySandbox({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  const [gameIdx, setGameIdx] = React.useState(0);
  const scenario = SCENARIOS[gameIdx];
  const [nick, setNick] = React.useState(scenario.defaultPlayer);
  const [method, setMethod] = React.useState(scenario.methods[0]);
  const [offline, setOffline] = React.useState(false);
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [visible, setVisible] = React.useState(0);
  const [orderNo, setOrderNo] = React.useState(104823);
  const timers = React.useRef<number[]>([]);
  const listRef = React.useRef<HTMLOListElement>(null);
  const autoplayed = React.useRef(false);
  const rootRef = React.useRef<HTMLDivElement>(null);

  const safeNick = nick.trim().replace(/\s+/g, "_").slice(0, 16) || scenario.defaultPlayer;
  const steps = React.useMemo(() => {
    const s = buildSteps(scenario, safeNick, offline);
    s[0] = { ...s[0], detail: `${method} · ${formatMoney(scenario.product.price)}` };
    return s;
  }, [scenario, safeNick, offline, method]);
  const totalMs = steps.reduce((acc, s) => acc + s.ms, 0);

  const clear = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  const run = React.useCallback(() => {
    clear();
    setPhase("running");
    setVisible(0);
    setOrderNo((n) => n + 1);
    if (reduce) {
      setVisible(steps.length);
      setPhase("done");
      return;
    }
    let t = 120;
    steps.forEach((step, i) => {
      t += step.kind === "joined" ? 1100 : step.kind === "executed" ? STEP_GAP + 120 : STEP_GAP;
      timers.current.push(window.setTimeout(() => setVisible(i + 1), t));
    });
    timers.current.push(window.setTimeout(() => setPhase("done"), t + 260));
  }, [reduce, steps]);

  // reset when scenario changes
  const selectGame = (i: number) => {
    clear();
    setGameIdx(i);
    setNick(SCENARIOS[i].defaultPlayer);
    setMethod(SCENARIOS[i].methods[0]);
    setPhase("idle");
    setVisible(0);
  };

  // autoplay once when first scrolled into view. The flag is set only when the run
  // actually starts, so a remount (Strict Mode, fast refresh) simply reschedules it.
  const runRef = React.useRef(run);
  React.useEffect(() => {
    runRef.current = run;
  }, [run]);
  React.useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    let timer: number | null = null;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !autoplayed.current && timer === null) {
          timer = window.setTimeout(() => {
            timer = null;
            autoplayed.current = true;
            runRef.current();
          }, 900);
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      if (timer !== null) window.clearTimeout(timer);
    };
  }, []);

  React.useEffect(() => clear, []);

  // keep newest step in view
  React.useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: reduce ? "auto" : "smooth" });
  }, [visible, reduce]);

  const running = phase === "running";

  return (
    <div
      ref={rootRef}
      className={cn(
        "relative overflow-hidden rounded-xl border border-line-strong bg-surface/95 shadow-[0_30px_80px_-30px_rgb(0_0_0/0.9),0_0_0_1px_rgb(0_0_0/0.4)]",
        className,
      )}
    >
      {/* header: game tabs */}
      <div className="flex items-center justify-between gap-3 border-b border-line px-3 py-2.5">
        <div role="tablist" aria-label="Игра" className="scrollbar-none flex items-center gap-0.5 overflow-x-auto">
          {SCENARIOS.map((s, i) => (
            <button
              key={s.game}
              role="tab"
              type="button"
              aria-selected={i === gameIdx}
              onClick={() => selectGame(i)}
              className={cn(
                "h-7 shrink-0 rounded-md px-2.5 text-[12.5px] font-medium transition-colors",
                i === gameIdx ? "bg-white/[0.08] text-fg" : "text-fg-3 hover:text-fg-2",
              )}
            >
              {s.tab}
            </button>
          ))}
        </div>
        <span className="label-mono hidden shrink-0 items-center gap-1.5 text-[10px] text-fg-4 sm:flex">
          <span className="size-1.5 rounded-full bg-ice-400" /> песочница
        </span>
      </div>

      {/* storefront fragment */}
      <div className="border-b border-line p-4">
        <div className="flex items-start gap-3.5">
          <ProductArt glyph={scenario.product.glyph} />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-3">
              <p className="truncate text-[15px] font-medium text-fg">{scenario.product.name}</p>
              <p className="shrink-0 font-mono text-[15px] font-semibold text-fg nums">{formatMoney(scenario.product.price)}</p>
            </div>
            <p className="text-xs text-fg-3">
              {scenario.product.caption} · {scenario.server}
            </p>
            <ul className="mt-2 hidden flex-wrap gap-x-3 gap-y-1 text-[11.5px] text-fg-3 sm:flex">
              {scenario.product.perks.map((p) => (
                <li key={p} className="flex items-center gap-1">
                  <Check className="size-3 text-azure-300" /> {p}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-[1fr_auto] items-end gap-3">
          <label className="block min-w-0">
            <span className="mb-1 block text-[11px] text-fg-3">
              Игрок <span className="text-fg-4">· {scenario.idLabel === "Ник" ? "ник в игре" : `${scenario.idLabel} подставим сами`}</span>
            </span>
            <input
              value={nick}
              onChange={(e) => setNick(e.target.value)}
              disabled={running}
              spellCheck={false}
              maxLength={16}
              aria-label="Ник игрока"
              className="h-8 w-full rounded-md border border-line bg-surface-2 px-2.5 font-mono text-[13px] text-fg outline-none transition-colors hover:border-line-strong focus:border-azure-500/70 disabled:opacity-60"
            />
          </label>
          <label className="flex h-8 cursor-pointer items-center gap-2 rounded-md border border-line bg-surface-2 px-2.5 text-[12px] text-fg-2 select-none">
            <Switch size="sm" checked={offline} onCheckedChange={(v) => setOffline(v)} disabled={running} aria-label="Игрок офлайн" />
            Игрок офлайн
          </label>
        </div>

        <div className="mt-3 flex items-center gap-1.5">
          {scenario.methods.map((m) => (
            <button
              key={m}
              type="button"
              disabled={running}
              onClick={() => setMethod(m)}
              className={cn(
                "h-7 rounded-md border px-2.5 text-[12px] font-medium transition-colors disabled:opacity-60",
                method === m ? "border-azure-400/50 bg-azure-500/12 text-azure-200" : "border-line text-fg-3 hover:border-line-strong hover:text-fg-2",
              )}
            >
              {m}
            </button>
          ))}
          <button
            type="button"
            onClick={run}
            disabled={running}
            className="ml-auto inline-flex h-8 items-center gap-1.5 rounded-md bg-white px-3.5 text-[13px] font-semibold text-canvas shadow-[inset_0_-1px_0_rgb(0_0_0/0.15)] transition-[background-color,opacity,transform] hover:bg-azure-50 active:translate-y-px disabled:opacity-70"
          >
            {phase === "done" ? <RotateCcw className="size-3.5" /> : <Zap className="size-3.5" />}
            {running ? "Выдаём…" : phase === "done" ? "Ещё раз" : `Купить за ${formatMoney(scenario.product.price)}`}
          </button>
        </div>
      </div>

      {/* trace */}
      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <p className="label-mono text-[10px] text-fg-4">
          Трасса заказа <span className="text-fg-3">PMC-{orderNo}</span>
        </p>
        <AnimatePresence mode="wait">
          {phase === "done" ? (
            <motion.p
              key="done"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-1.5 font-mono text-[11.5px] text-ok"
            >
              <Check className="size-3.5" /> {offline ? `выдано при входе · ${totalMs} мс после входа` : `выдано за ${totalMs} мс`}
            </motion.p>
          ) : running ? (
            <motion.p key="run" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="font-mono text-[11.5px] text-ice-300">
              в процессе…
            </motion.p>
          ) : null}
        </AnimatePresence>
      </div>
      <ol ref={listRef} className="scrollbar-none relative h-[268px] overflow-y-auto px-4 pb-3" aria-live="polite">
        {phase === "idle" ? (
          <li className="flex h-full flex-col items-center justify-center text-center">
            <p className="text-[13px] text-fg-2">Нажмите «Купить» — покажем путь платежа до игры.</p>
            <p className="mt-1 text-xs text-fg-4">Ник можно заменить на свой.</p>
          </li>
        ) : (
          steps.slice(0, visible).map((step, i) => (
            <TraceRow key={`${orderNo}-${i}`} step={step} last={i === visible - 1} running={running} isFinal={i === steps.length - 1} />
          ))
        )}
      </ol>

      {/* in-game chat */}
      <div className="relative border-t border-line bg-[#06080c] px-4 py-3">
        <p className="label-mono mb-1.5 text-[10px] text-fg-4">Чат в игре</p>
        <div className="min-h-[40px] font-mono text-[12px] leading-[1.6]">
          <AnimatePresence>
            {phase === "done" ? (
              <motion.div key={`chat-${orderNo}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                <p className="truncate">
                  <span className="text-ice-300">{scenario.chat.prefix}</span>{" "}
                  <span className="text-fg-2">{fillTemplate(scenario.chat.broadcast, safeNick, scenario)}</span>
                </p>
                <p className="truncate text-azure-200">
                  <span className="text-fg-4">→ </span>
                  {scenario.chat.personal}
                </p>
              </motion.div>
            ) : (
              <p className="text-fg-4">
                <span className="animate-blink">▌</span>
              </p>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function TraceRow({ step, last, running, isFinal }: { step: ScenarioStep; last: boolean; running: boolean; isFinal: boolean }) {
  const pending = step.kind === "awaiting";
  const active = last && running && !isFinal;
  return (
    <motion.li
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className="relative grid grid-cols-[18px_1fr_auto] gap-x-2.5 pb-2.5"
    >
      {/* rail */}
      <span aria-hidden className="absolute top-[18px] bottom-0 left-[8.5px] w-px bg-line" />
      <span
        className={cn(
          "relative z-10 mt-[3px] flex size-[18px] items-center justify-center rounded-full border",
          pending
            ? "border-ice-400/40 bg-ice-400/10 text-ice-300"
            : step.kind === "joined"
              ? "border-azure-400/40 bg-azure-500/15 text-azure-300"
              : active
                ? "border-azure-400/50 bg-azure-500/15 text-azure-300"
                : "border-ok/30 bg-ok-soft text-ok",
        )}
      >
        {pending ? <Clock3 className="size-2.5" /> : step.kind === "joined" ? <LogIn className="size-2.5" /> : <Check className="size-2.5" strokeWidth={3} />}
      </span>
      <div className="min-w-0">
        <p className="text-[13px] leading-6 text-fg">{step.title}</p>
        {step.detail ? <p className="-mt-0.5 truncate text-[11.5px] text-fg-3">{step.detail}</p> : null}
        {step.command ? (
          <div className="mt-1.5 overflow-hidden rounded-md border border-line-soft bg-[#06080c] px-2.5 py-1.5 font-mono text-[11.5px] leading-[1.55]">
            <p className="truncate text-fg-2">
              <span className="text-fg-4 select-none">$ </span>
              {step.command}
            </p>
            <p className="flex items-start gap-1 truncate text-ice-300/90">
              <CornerDownRight className="mt-[3px] size-3 shrink-0 text-fg-4" />
              <span className="truncate">{step.output}</span>
            </p>
          </div>
        ) : null}
      </div>
      <span className={cn("pt-[3px] font-mono text-[11px] nums", pending ? "text-ice-300" : "text-fg-4")}>
        {pending ? "ждём" : step.kind === "joined" ? "вход" : step.ms === 0 ? "0 мс" : `+${step.ms} мс`}
      </span>
    </motion.li>
  );
}

function ProductArt({ glyph }: { glyph: string }) {
  return (
    <div className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-azure-400/30 bg-gradient-to-br from-azure-600 via-azure-800 to-azure-950">
      <div className="absolute inset-0 bg-grid-sm opacity-70" />
      <div className="absolute -top-3 -right-3 size-8 rotate-45 bg-ice-400/25" />
      <span className="relative font-display text-xl font-semibold tracking-[-0.04em] text-white">{glyph}</span>
    </div>
  );
}
