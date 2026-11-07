"use client";

import * as React from "react";
import {
  AlertTriangle,
  Check,
  CheckCheck,
  Clock3,
  CornerDownRight,
  CreditCard,
  FileCheck2,
  ListOrdered,
  LogIn,
  RotateCw,
  Send,
  Terminal,
  Undo2,
  Webhook,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatTime } from "@/lib/format";
import { NOW_MS } from "@/lib/mock/now";
import type { TraceStep, TraceStepKind } from "@/lib/mock/types";
import { CopyButton } from "@/components/ui/copy-button";
import { formatClock, formatDelta } from "./format";

const KIND_ICON: Record<TraceStepKind, LucideIcon> = {
  payment: CreditCard,
  webhook: Webhook,
  queued: ListOrdered,
  sent: Send,
  executed: Terminal,
  confirmed: CheckCheck,
  awaiting_player: Clock3,
  retry: RotateCw,
  error: AlertTriangle,
  refund: Undo2,
  receipt: FileCheck2,
};

const NODE: Record<TraceStep["status"], string> = {
  ok: "border-ok/30 bg-ok-soft text-ok",
  warn: "border-warn/35 bg-warn-soft text-warn",
  error: "border-bad/40 bg-bad-soft text-bad",
  pending: "border-ice-400/45 bg-ice-400/10 text-ice-300",
};

const TITLE: Record<TraceStep["status"], string> = {
  ok: "text-fg",
  warn: "text-warn",
  error: "text-bad",
  pending: "text-ice-200",
};

type Item = { type: "step"; step: TraceStep } | { type: "retries"; steps: TraceStep[] };

/** Consecutive retries collapse into one item with a compact attempts table. */
function group(steps: TraceStep[]): Item[] {
  const out: Item[] = [];
  for (const s of steps) {
    const prev = out[out.length - 1];
    if (s.kind === "retry" && s.title.startsWith("Повтор ") && /из \d/.test(s.title)) {
      if (prev?.type === "retries") prev.steps.push(s);
      else out.push({ type: "retries", steps: [s] });
    } else out.push({ type: "step", step: s });
  }
  // a single retry reads better as a normal step
  return out.map((it): Item => (it.type === "retries" && it.steps.length < 2 ? { type: "step", step: it.steps[0] } : it));
}

function iconFor(step: TraceStep): LucideIcon {
  if (step.kind === "sent" && step.title.includes("зашёл")) return LogIn;
  if (step.status === "error" && step.kind !== "retry") return X;
  if (step.status === "ok" && (step.kind === "executed" || step.kind === "confirmed")) return step.kind === "confirmed" ? CheckCheck : Check;
  return KIND_ICON[step.kind];
}

export function DeliveryTrace({ steps, className }: { steps: TraceStep[]; className?: string }) {
  const items = React.useMemo(() => group(steps), [steps]);
  return (
    <ol className={cn("relative", className)}>
      {items.map((it, i) => {
        const last = i === items.length - 1;
        if (it.type === "retries") return <RetriesItem key={it.steps[0].id} steps={it.steps} last={last} />;
        return <StepItem key={it.step.id} step={it.step} last={last} />;
      })}
    </ol>
  );
}

function Rail({ last }: { last: boolean }) {
  if (last) return null;
  return <span aria-hidden className="absolute top-6 bottom-0 left-[10.5px] w-px bg-line" />;
}

function Node({ status, icon: Icon, pulse }: { status: TraceStep["status"]; icon: LucideIcon; pulse?: boolean }) {
  return (
    <span
      className={cn(
        "relative z-10 mt-0.5 flex size-[22px] items-center justify-center rounded-full border",
        NODE[status],
        pulse && "animate-pulse-dot",
      )}
    >
      <Icon className="size-3" strokeWidth={2.4} />
    </span>
  );
}

function TimeCol({ at, deltaMs, tone }: { at: string; deltaMs?: number; tone?: string }) {
  return (
    <div className="shrink-0 text-right">
      <p className={cn("font-mono text-[11px] leading-5 text-fg-3 nums", tone)}>{formatClock(at)}</p>
      {deltaMs !== undefined ? <p className="font-mono text-[11px] leading-4 text-fg-4 nums">{formatDelta(deltaMs)}</p> : null}
    </div>
  );
}

function StepItem({ step, last }: { step: TraceStep; last: boolean }) {
  const pending = step.status === "pending";
  return (
    <li className="relative grid grid-cols-[22px_minmax(0,1fr)] gap-x-3 pb-4 last:pb-0">
      <Rail last={last} />
      <Node status={step.status} icon={iconFor(step)} pulse={pending && (step.kind === "executed" || step.kind === "receipt")} />
      <div className="min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className={cn("text-[13px] leading-5 font-medium", TITLE[step.status])}>{step.title}</p>
            {step.detail ? <p className="mt-0.5 text-[12px] leading-snug text-fg-3">{step.detail}</p> : null}
          </div>
          {/* a scheduled retry has no real delta — it has not happened yet */}
          <TimeCol at={step.at} deltaMs={pending && step.kind === "retry" ? undefined : step.deltaMs} tone={pending ? "text-ice-300" : undefined} />
        </div>
        {step.command ? <ConsoleLine command={step.command} output={step.output} status={step.status} /> : null}
      </div>
    </li>
  );
}

export function ConsoleLine({ command, output, status }: { command: string; output?: string; status: TraceStep["status"] }) {
  return (
    <div className="group/console mt-2 overflow-hidden rounded-md border border-line-soft bg-[#06080c]">
      <div className="flex items-start gap-2 px-2.5 py-1.5 font-mono text-[11.5px] leading-[1.6]">
        <div className="min-w-0 flex-1">
          <p className="break-all text-fg-2">
            <span className="text-fg-4 select-none">$ </span>
            {command}
          </p>
          {output ? (
            <p className={cn("flex items-start gap-1 break-all", status === "error" ? "text-bad/90" : status === "pending" ? "text-fg-4" : "text-ice-300/90")}>
              <CornerDownRight className="mt-[4px] size-3 shrink-0 text-fg-4" />
              <span>{output}</span>
            </p>
          ) : status === "pending" ? (
            <p className="text-fg-4">
              <span className="animate-blink">▌</span>
            </p>
          ) : null}
        </div>
        <CopyButton value={command} label="Скопировать команду" className="-mr-1 size-6 opacity-0 transition-opacity group-hover/console:opacity-100 focus-visible:opacity-100" />
      </div>
    </div>
  );
}

/** Same back-off as the delivery agent: 30 с → 1 мин → 2 мин → 5 мин, then every 5 мин. */
const RETRY_GAPS_MS = [30_000, 60_000, 120_000, 300_000, 300_000];

const OUTCOME: Record<TraceStep["status"], { label: string; cls: string }> = {
  ok: { label: "ок", cls: "text-ok" },
  warn: { label: "нет ответа", cls: "text-warn" },
  error: { label: "ошибка", cls: "text-bad" },
  pending: { label: "ждём", cls: "text-ice-300" },
};

/** «46 с» · «4 мин» — the wait until the next attempt, rounded like the agent reports it */
function formatWait(ms: number) {
  return ms < 90_000 ? `${Math.max(1, Math.round(ms / 1000))} с` : `${Math.round(ms / 60_000)} мин`;
}

function RetriesItem({ steps, last }: { steps: TraceStep[]; last: boolean }) {
  // the scheduled attempt is not an attempt yet — it goes to the footer, not to the table
  const attempts = steps.filter((s) => s.status !== "pending");
  const next = steps.find((s) => s.status === "pending");
  const lastAttempt = attempts[attempts.length - 1] ?? steps[steps.length - 1];
  const done = attempts.length;
  const max = Math.max(done, Number(steps.map((s) => s.title.match(/из (\d+)/)?.[1]).find(Boolean) ?? done));
  const exhausted = !next && done >= max;
  const status: TraceStep["status"] = exhausted && attempts.every((s) => s.status === "error") ? "error" : next ? "warn" : lastAttempt.status;
  const outStep = [...attempts].reverse().find((s) => s.output);
  // next attempt = last attempt + the next interval of the schedule (never in the past)
  const nextAt = next ? Math.max(new Date(lastAttempt.at).getTime() + (RETRY_GAPS_MS[done] ?? 300_000), NOW_MS + 5_000) : null;
  return (
    <li className="relative grid grid-cols-[22px_minmax(0,1fr)] gap-x-3 pb-4 last:pb-0">
      <Rail last={last} />
      <Node status={status} icon={RotateCw} />
      <div className="min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className={cn("text-[13px] leading-5 font-medium", TITLE[status])}>
              Автоповторы · <span className="font-mono nums">{done}</span> из <span className="font-mono nums">{max}</span>
              {exhausted ? " — попытки закончились" : null}
            </p>
            <p className="mt-0.5 text-[12px] leading-snug text-fg-3">{exhausted ? "Нужно действие владельца" : (next?.detail ?? lastAttempt.detail)}</p>
          </div>
          <TimeCol at={lastAttempt.at} tone={status === "error" ? "text-bad/80" : undefined} />
        </div>
        <div className="mt-2 overflow-hidden rounded-md border border-line-soft">
          <table className="w-full text-[11.5px]">
            <thead>
              <tr className="bg-white/[0.02] text-left">
                <th className="h-7 px-2.5 label-mono text-fg-4">Попытка</th>
                <th className="h-7 px-2.5 label-mono text-fg-4">Время</th>
                <th className="h-7 px-2.5 text-right label-mono text-fg-4">Пауза</th>
                <th className="h-7 px-2.5 text-right label-mono text-fg-4">Итог</th>
              </tr>
            </thead>
            <tbody>
              {attempts.map((s, i) => (
                <tr key={s.id} className="border-t border-line-soft">
                  <td className="h-7 px-2.5 font-mono text-fg-2 nums">
                    {i + 1}/{max}
                  </td>
                  <td className="h-7 px-2.5 font-mono text-fg-3 nums">{formatClock(s.at)}</td>
                  <td className="h-7 px-2.5 text-right font-mono text-fg-4 nums">{s.deltaMs ? formatDelta(s.deltaMs) : "сразу"}</td>
                  <td className={cn("h-7 px-2.5 text-right font-mono whitespace-nowrap", OUTCOME[s.status].cls)}>{OUTCOME[s.status].label}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {outStep?.output ? (
            <p
              className={cn(
                "flex items-start gap-1 border-t border-line-soft bg-[#06080c] px-2.5 py-1.5 font-mono text-[11px]",
                outStep.status === "error" ? "text-bad/90" : "text-warn/90",
              )}
            >
              <CornerDownRight className="mt-[3px] size-3 shrink-0 text-fg-4" />
              {outStep.output}
            </p>
          ) : null}
          {next && nextAt !== null ? (
            <p className="flex items-center gap-1.5 border-t border-line-soft bg-ice-400/[0.04] px-2.5 py-1.5 text-[11.5px] text-ice-200">
              <Clock3 className="size-3 shrink-0 text-ice-300" />
              <span>
                Следующая попытка через <span className="font-mono nums">{formatWait(nextAt - NOW_MS)}</span>
                <span className="text-fg-3"> · ≈</span>
                <span className="font-mono text-fg-2 nums">{formatTime(Math.round(nextAt / 60_000) * 60_000)}</span>
                {done + 1 <= max ? <span className="text-fg-3"> · {done + 1}-я из {max}</span> : null}
              </span>
            </p>
          ) : null}
        </div>
      </div>
    </li>
  );
}
