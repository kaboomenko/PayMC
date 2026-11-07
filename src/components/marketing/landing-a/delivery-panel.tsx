"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  AlertTriangle,
  Check,
  Clock3,
  CornerDownRight,
  FileDown,
  LayoutDashboard,
  LogIn,
  Megaphone,
  Package,
  Play,
  ReceiptText,
  RotateCcw,
  RotateCw,
  Search,
  Server,
  Settings,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDuration, formatMoney, formatTime, pluralize } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Kbd } from "@/components/ui/kbd";
import { PixelAvatar } from "@/components/ui/avatar";
import { CopyButton } from "@/components/ui/copy-button";
import { StatusDot } from "@/components/ui/status-dot";
import { toast } from "@/components/ui/toaster";
import { GameChip } from "@/components/dashboard/game-chip";
import type { DeliveryDemo, DemoOrder, DemoOrderState, DemoStep, InGame } from "./delivery-data";

/** Applies the simulated "next event" (player joined / server recovered) to an order. */
function stateOf(order: DemoOrder, resolved: boolean): DemoOrderState {
  if (!resolved || !order.resolve) return order;
  const base = order.steps
    .filter((s) => !(s.kind === "retry" && s.status === "pending"))
    .map((s) => (s.status === "pending" ? { ...s, status: "ok" as const } : s));
  return { steps: [...base, ...order.resolve.extra], status: order.resolve.after.status, ingame: order.resolve.after.ingame };
}

const RAIL = [
  { icon: LayoutDashboard, label: "Обзор" },
  { icon: ReceiptText, label: "Заказы", active: true },
  { icon: Users, label: "Игроки" },
  { icon: Package, label: "Товары" },
  { icon: Server, label: "Серверы" },
  { icon: Megaphone, label: "Кампании" },
  { icon: Wallet, label: "Финансы" },
];

export function DeliveryPanel({ demo, className }: { demo: DeliveryDemo; className?: string }) {
  const { orders } = demo;
  const reduce = useReducedMotion();
  const [selectedId, setSelectedId] = React.useState(orders[0]?.id ?? "");
  const [resolved, setResolved] = React.useState<Record<string, boolean>>({});
  const [justResolved, setJustResolved] = React.useState<string | null>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  const traceRef = React.useRef<HTMLOListElement>(null);

  const order = orders.find((o) => o.id === selectedId) ?? orders[0];
  const state = stateOf(order, !!resolved[order.id]);

  const sectionRef = React.useRef<HTMLElement>(null);

  const select = (id: string, fromClick = false) => {
    setSelectedId(id);
    setJustResolved(null);
    // on narrow screens the trace sits below the list — bring it into view
    if (fromClick && window.matchMedia("(max-width: 1023px)").matches) {
      window.requestAnimationFrame(() => {
        const el = sectionRef.current;
        if (el && el.getBoundingClientRect().top > window.innerHeight * 0.55) {
          el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
        }
      });
    }
  };

  const onListKey = (e: React.KeyboardEvent) => {
    const idx = orders.findIndex((o) => o.id === selectedId);
    const n = orders.length;
    let next = idx;
    if (e.key === "ArrowDown" || e.key === "ArrowRight") next = (idx + 1) % n;
    else if (e.key === "ArrowUp" || e.key === "ArrowLeft") next = (idx - 1 + n) % n;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = n - 1;
    else return;
    e.preventDefault();
    select(orders[next].id);
    listRef.current?.querySelectorAll<HTMLButtonElement>("[role=tab]")[next]?.focus();
  };

  const resolve = () => {
    setResolved((r) => ({ ...r, [order.id]: true }));
    setJustResolved(order.id);
  };
  const reset = () => {
    setResolved((r) => ({ ...r, [order.id]: false }));
    setJustResolved(null);
  };

  // keep freshly appended steps in view
  React.useEffect(() => {
    const el = traceRef.current;
    if (!el || !justResolved) return;
    const t = window.setTimeout(() => el.scrollTo({ top: el.scrollHeight, behavior: reduce ? "auto" : "smooth" }), 120);
    return () => window.clearTimeout(t);
  }, [justResolved, reduce]);

  const queue = demo.queues.map((q) => (q.orderId && q.resolved && resolved[q.orderId] ? { ...q, ...q.resolved } : q));

  const baseCount = order.steps.filter((s) => !(s.kind === "retry" && s.status === "pending")).length;
  const delivered = state.status.tone === "ok";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border border-line-strong bg-surface shadow-[0_40px_120px_-40px_rgb(0_0_0/0.95),0_0_0_1px_rgb(0_0_0/0.4)]",
        className,
      )}
    >
      {/* window bar */}
      <div className="flex h-11 items-center gap-3 border-b border-line bg-surface-2/60 px-3">
        <div className="flex min-w-0 items-center gap-2 text-[13px]">
          <GameChip game="minecraft" size={20} />
          <span className="truncate font-medium text-fg">ArcticMC</span>
          <span className="text-fg-4">/</span>
          <span className="text-fg-2">Заказы</span>
        </div>
        <div className="ml-auto hidden h-7 w-64 items-center gap-2 rounded-md border border-line bg-surface px-2 text-[12px] text-fg-4 md:flex">
          <Search className="size-3.5" />
          <span className="flex-1 truncate">Ник, номер заказа или чека</span>
          <Kbd className="h-[18px] text-[11px]">/</Kbd>
        </div>
        <p className="ml-auto flex shrink-0 items-center gap-2 font-mono text-[11px] text-fg-3 md:ml-0">
          <StatusDot tone="ok" className="size-1.5" />
          <span className="hidden sm:inline">
            {demo.serversUp} из {pluralize(demo.serversTotal, ["сервера", "серверов", "серверов"])} на связи
          </span>
          <span className="sm:hidden">
            {demo.serversUp}/{demo.serversTotal} онлайн
          </span>
        </p>
      </div>

      <div className="grid lg:h-[680px] lg:grid-cols-[52px_340px_minmax(0,1fr)]">
        {/* icon rail — dashboard context */}
        <nav aria-hidden className="hidden flex-col items-center gap-1 border-r border-line-soft bg-canvas/40 py-3 lg:flex">
          {RAIL.map((r) => (
            <span
              key={r.label}
              title={r.label}
              className={cn(
                "relative flex size-8 items-center justify-center rounded-md",
                r.active ? "bg-white/[0.07] text-azure-300" : "text-fg-4",
              )}
            >
              {r.active ? <span className="absolute top-1.5 bottom-1.5 -left-[10px] w-[2px] rounded-r-full bg-azure-400" /> : null}
              <r.icon className="size-4" />
            </span>
          ))}
          <span className="mt-auto flex size-8 items-center justify-center text-fg-4">
            <Settings className="size-4" />
          </span>
        </nav>

        {/* orders list + server queues */}
        <div className="flex min-w-0 flex-col border-b border-line lg:border-r lg:border-b-0">
          <div className="flex h-10 items-center justify-between border-b border-line-soft px-3.5">
            <p className="label-mono text-fg-4">
              Сегодня <span className="text-fg-3">· последние {orders.length}</span>
            </p>
            <span className="hidden items-center gap-1 text-[11px] text-fg-4 sm:flex">
              <Kbd className="h-[18px] min-w-[18px] text-[11px]">↑</Kbd>
              <Kbd className="h-[18px] min-w-[18px] text-[11px]">↓</Kbd>
            </span>
          </div>

          <div ref={listRef} role="tablist" aria-orientation="vertical" aria-label="Заказы" onKeyDown={onListKey} className="p-1.5">
            {orders.map((o) => {
              const active = o.id === selectedId;
              const st = stateOf(o, !!resolved[o.id]).status;
              return (
                <button
                  key={o.id}
                  type="button"
                  role="tab"
                  id={`dp-tab-${o.id}`}
                  aria-selected={active}
                  aria-controls="dp-trace"
                  tabIndex={active ? 0 : -1}
                  onClick={() => select(o.id, true)}
                  className={cn(
                    "group relative grid w-full grid-cols-[28px_minmax(0,1fr)] items-center gap-x-3 rounded-lg px-2.5 py-2.5 text-left transition-colors duration-150",
                    active ? "bg-white/[0.06]" : "hover:bg-white/[0.03]",
                  )}
                >
                  {active ? <span aria-hidden className="absolute inset-y-2.5 left-0 w-[2px] rounded-r-full bg-azure-400" /> : null}
                  <PixelAvatar name={o.player} size={28} />
                  <span className="min-w-0">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className={cn("truncate font-mono text-[13px]", active ? "text-fg" : "text-fg-2")}>{o.player}</span>
                      <span className="shrink-0 font-mono text-[12px] text-fg-3 nums">{formatMoney(o.price)}</span>
                    </span>
                    <span className="mt-1 flex items-center justify-between gap-2">
                      <span className="truncate text-[12px] text-fg-3">{o.item}</span>
                      <Badge tone={st.tone} className="shrink-0 font-mono text-[11px]">
                        {st.label}
                      </Badge>
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          <dl className="mt-auto hidden grid-cols-2 gap-px border-t border-line-soft bg-line-soft lg:grid">
            {[
              { k: "0,3 с", v: "медиана выдачи" },
              { k: "99,2 %", v: "с первой попытки" },
              { k: resolved["PMC-104850"] ? "0" : "1", v: "ждёт входа игрока" },
              { k: resolved["PMC-104849"] ? "0" : "1", v: "на автоповторе" },
            ].map((s) => (
              <div key={s.v} className="bg-surface px-3.5 py-2.5">
                <dt className="sr-only">{s.v}</dt>
                <dd className="font-mono text-[15px] text-fg nums">{s.k}</dd>
                <dd className="text-[11px] text-fg-4">{s.v}</dd>
              </div>
            ))}
          </dl>
          <div className="hidden border-t border-line-soft p-3.5 lg:block">
            <p className="label-mono mb-2.5 text-fg-4">Очереди серверов</p>
            <ul className="space-y-2">
              {queue.map((q) => (
                <li key={q.name} className="flex items-baseline gap-2.5 text-[12px]">
                  <StatusDot tone={q.tone} className="size-1.5 shrink-0 -translate-y-px" />
                  <span className="w-[74px] shrink-0 text-fg-2">{q.name}</span>
                  <span className={cn("min-w-0 font-mono text-[11px] leading-snug", q.tone === "bad" ? "text-bad" : "text-fg-4")}>{q.note}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* trace */}
        <section
          ref={sectionRef}
          id="dp-trace"
          role="tabpanel"
          aria-labelledby={`dp-tab-${order.id}`}
          className="flex min-h-0 min-w-0 scroll-mt-20 flex-col"
        >
          <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 border-b border-line-soft px-4 py-3 sm:px-5">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-mono text-[14px] font-medium text-fg">{order.id}</h3>
                <CopyButton value={order.id} label="Скопировать номер заказа" className="size-6" />
                <Badge tone={state.status.tone} size="md" className="font-mono text-[11px]">
                  {state.status.label}
                </Badge>
              </div>
              <p className="mt-1 truncate text-[12.5px] text-fg-3">
                <span className="font-mono text-fg-2">{order.player}</span> · {order.item} · {formatMoney(order.price)} · {order.method} ·
                «{order.server}» · {formatTime(order.at)}
              </p>
            </div>
            <button
              type="button"
              disabled={!delivered}
              onClick={() =>
                toast.success("Пакет для спора собран", {
                  description: `${order.id}: трасса выдачи, IP, время входа и UUID — одним PDF для банка`,
                })
              }
              className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md border border-line px-2.5 text-[12px] text-fg-2 transition-colors hover:border-line-strong hover:text-fg disabled:pointer-events-none disabled:opacity-40"
            >
              <FileDown className="size-3.5" /> Пакет для спора
            </button>
          </header>

          <ol
            ref={traceRef}
            className="scrollbar-none relative min-h-0 flex-1 overflow-y-auto px-4 pt-4 pb-2 sm:px-5 lg:[mask-image:linear-gradient(to_bottom,transparent,#000_14px,#000_calc(100%-14px),transparent)]"
            aria-live="polite"
          >
            {state.steps.map((step, i) => {
              const isExtra = i >= baseCount;
              const delay = reduce ? 0 : isExtra && justResolved === order.id ? 0.15 + (i - baseCount) * 0.32 : Math.min(i, 9) * 0.025;
              return (
                <TraceRow
                  key={`${order.id}-${step.kind}-${step.title}`}
                  step={step}
                  first={i === 0}
                  last={i === state.steps.length - 1}
                  at={order.at}
                  delay={delay}
                  animate={!reduce}
                />
              );
            })}
          </ol>

          {order.resolve ? (
            <div className="mx-4 mb-3 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-dashed border-line-strong bg-surface-2/50 px-3 py-2.5 sm:mx-5">
              <p className="min-w-0 flex-1 text-[12.5px] text-fg-3">
                {resolved[order.id] ? "Готово — так это выглядит в журнале. Можно повторить." : order.resolve.note}
              </p>
              {resolved[order.id] ? (
                <button
                  type="button"
                  onClick={reset}
                  className="inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[12px] text-fg-2 transition-colors hover:bg-white/[0.05] hover:text-fg"
                >
                  <RotateCcw className="size-3.5" /> Сбросить
                </button>
              ) : (
                <button
                  type="button"
                  onClick={resolve}
                  className="inline-flex h-7 items-center gap-1.5 rounded-md bg-white px-2.5 text-[12px] font-semibold text-canvas transition-colors hover:bg-azure-50 active:translate-y-px"
                >
                  <Play className="size-3.5" /> {order.resolve.action}
                </button>
              )}
            </div>
          ) : null}

          <InGamePreview data={state.ingame} player={order.player} keyId={`${order.id}-${resolved[order.id] ? 1 : 0}`} />
        </section>
      </div>
    </div>
  );
}

function stepIcon(step: DemoStep) {
  if (step.kind === "joined") return { icon: LogIn, cls: "border-azure-400/40 bg-azure-500/15 text-azure-300" };
  if (step.status === "pending") {
    return step.kind === "awaiting"
      ? { icon: Clock3, cls: "border-ice-400/40 bg-ice-400/10 text-ice-300" }
      : { icon: RotateCw, cls: "border-ice-400/40 bg-ice-400/10 text-ice-300" };
  }
  if (step.status === "warn") {
    return step.kind === "retry"
      ? { icon: RotateCw, cls: "border-warn/30 bg-warn-soft text-warn" }
      : { icon: AlertTriangle, cls: "border-warn/30 bg-warn-soft text-warn" };
  }
  if (step.status === "error") return { icon: X, cls: "border-bad/30 bg-bad-soft text-bad" };
  if (step.kind === "awaiting") return { icon: Clock3, cls: "border-ok/30 bg-ok-soft text-ok" };
  if (step.kind === "receipt") return { icon: ReceiptText, cls: "border-ok/30 bg-ok-soft text-ok" };
  return { icon: Check, cls: "border-ok/30 bg-ok-soft text-ok" };
}

function TraceRow({
  step,
  first,
  last,
  at,
  delay,
  animate,
}: {
  step: DemoStep;
  first: boolean;
  last: boolean;
  at: string;
  delay: number;
  animate: boolean;
}) {
  const { icon: Icon, cls } = stepIcon(step);
  const pending = step.status === "pending";
  const timing = first
    ? formatTime(at, true)
    : (step.deltaLabel ?? (pending ? "ждём" : step.delta != null ? `+${formatDuration(step.delta)}` : ""));
  return (
    <motion.li
      initial={animate ? { opacity: 0, y: 6 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay, ease: [0.22, 1, 0.36, 1] }}
      className="relative grid grid-cols-[20px_minmax(0,1fr)_auto] gap-x-3 pb-3"
    >
      {!last ? <span aria-hidden className="absolute top-[22px] bottom-0 left-[9.5px] w-px bg-line" /> : null}
      <span className={cn("relative z-10 mt-0.5 flex size-5 items-center justify-center rounded-full border", cls)}>
        {pending ? <span aria-hidden className="absolute inset-0 animate-ping rounded-full bg-ice-400/20 motion-reduce:hidden" /> : null}
        <Icon className="size-2.5" strokeWidth={2.75} />
      </span>
      <div className="min-w-0">
        <p className={cn("text-[13px] leading-5", step.status === "error" ? "text-bad" : "text-fg")}>{step.title}</p>
        {step.detail ? <p className="text-[11.5px] leading-4 text-fg-3">{step.detail}</p> : null}
        {step.command ? (
          <div className="mt-1.5 overflow-hidden rounded-md border border-line-soft bg-[#06080c] px-2.5 py-1.5 font-mono text-[11.5px] leading-[1.6]">
            <p className="break-all text-fg-2 sm:truncate sm:break-normal">
              <span className="text-fg-4 select-none">&gt; </span>
              {step.command}
            </p>
            {step.output ? (
              <p className={cn("flex items-start gap-1", step.status === "ok" ? "text-ice-300/90" : "text-warn/90")}>
                <CornerDownRight aria-hidden className="mt-[3px] size-3 shrink-0 text-fg-4" />
                <span className="min-w-0 break-words">{step.output}</span>
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
      <span className={cn("pt-0.5 font-mono text-[11px] leading-5 whitespace-nowrap nums", pending ? "text-ice-300" : first ? "text-fg-3" : "text-fg-4")}>
        {timing}
      </span>
    </motion.li>
  );
}

function InGamePreview({ data, player, keyId }: { data: InGame; player: string; keyId: string }) {
  const label = data.kind === "empty" ? "Что увидит игрок" : "Что увидел игрок";
  return (
    <div className="border-t border-line bg-[#06080c] px-4 py-3 sm:px-5">
      <p className="label-mono mb-2 flex items-center justify-between text-fg-4">
        <span>{label}</span>
        <span className="font-mono normal-case tracking-normal text-fg-4">{player}</span>
      </p>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={keyId}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="min-h-[64px]"
        >
          {data.kind === "chat" ? (
            <div className="space-y-0.5 rounded-sm bg-black/40 px-2.5 py-2 font-mono text-[12px] leading-[1.55]">
              {data.lines.map((l, i) => (
                <p key={i} className={l.personal ? "text-azure-200" : "text-fg-2"}>
                  {l.personal ? <span className="text-fg-4">→ </span> : null}
                  {l.prefix ? <span className="text-ice-300">{l.prefix} </span> : null}
                  {l.text}
                </p>
              ))}
            </div>
          ) : data.kind === "title" ? (
            <div className="relative flex h-[72px] flex-col items-center justify-center overflow-hidden rounded-sm bg-[linear-gradient(180deg,#0d1626,#070b12)] text-center">
              <div aria-hidden className="absolute inset-0 bg-grid-sm opacity-60" />
              <p className="relative font-display text-[19px] font-semibold tracking-[-0.01em] text-white [text-shadow:0_2px_0_rgb(0_0_0/0.6)]">
                {data.title}
              </p>
              <p className="relative mt-0.5 text-[12px] text-ice-200 [text-shadow:0_1px_0_rgb(0_0_0/0.6)]">{data.subtitle}</p>
            </div>
          ) : data.kind === "bossbar" ? (
            <div className="space-y-2">
              <div className="rounded-sm bg-[linear-gradient(180deg,#0d1626,#070b12)] px-3 py-2 text-center">
                <p className="text-[12px] text-white [text-shadow:0_1px_0_rgb(0_0_0/0.6)]">{data.text}</p>
                <div className="relative mx-auto mt-1.5 h-[6px] max-w-[320px] overflow-hidden rounded-[1px] bg-white/10 ring-1 ring-black/60">
                  <div className="h-full bg-ice-400" style={{ width: `${Math.round(data.progress * 100)}%` }} />
                  <div aria-hidden className="absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent_0,transparent_calc(5%-1px),rgb(0_0_0/0.45)_calc(5%-1px),rgb(0_0_0/0.45)_5%)]" />
                </div>
              </div>
              <p className="rounded-sm bg-black/40 px-2.5 py-1.5 font-mono text-[12px] text-fg-2">
                <span className="text-ice-300">[ArcticMC] </span>
                {data.chat}
              </p>
            </div>
          ) : (
            <p className="flex h-[64px] items-center gap-2 rounded-sm border border-dashed border-line px-3 font-mono text-[12px] text-fg-4">
              <Clock3 className="size-3.5 shrink-0 text-ice-300" />
              {data.text}
            </p>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
