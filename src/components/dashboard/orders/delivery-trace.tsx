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
      {deltaMs !== undefined ? <p className="font-mono text-[10.5px] leading-4 text-fg-4 nums">{formatDelta(deltaMs)}</p> : null}
    </div>
  );
}

function StepItem({ step, last }: { step: TraceStep; last: boolean }) {
  const pending = step.status === "pending";
  return (
    <li className="relative grid grid-cols-[22px_minmax(0,1fr)] gap-x-3 pb-4 last:pb-0">
      <Rail last={last} />
      <Node status={step.status} icon={iconFor(step)} pulse={pending} />
      <div className="min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className={cn("text-[13px] leading-5 font-medium", TITLE[step.status])}>{step.title}</p>
            {step.detail ? <p className="mt-0.5 text-[12px] leading-snug text-fg-3">{step.detail}</p> : null}
          </div>
          <TimeCol at={step.at} deltaMs={step.deltaMs} tone={pending ? "text-ice-300" : undefined} />
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

function RetriesItem({ steps, last }: { steps: TraceStep[]; last: boolean }) {
  const final = steps[steps.length - 1];
  const failed = steps.every((s) => s.status === "error");
  const status: TraceStep["status"] = failed ? "error" : final.status;
  const total = steps.length;
  const out = steps.find((s) => s.output)?.output;
  return (
    <li className="relative grid grid-cols-[22px_minmax(0,1fr)] gap-x-3 pb-4 last:pb-0">
      <Rail last={last} />
      <Node status={status} icon={RotateCw} />
      <div className="min-w-0">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className={cn("text-[13px] leading-5 font-medium", TITLE[status])}>
              Автоповторы · {total} из {total}
            </p>
            <p className="mt-0.5 text-[12px] leading-snug text-fg-3">{final.detail}</p>
          </div>
          <TimeCol at={final.at} tone={status === "error" ? "text-bad/80" : undefined} />
        </div>
        <div className="mt-2 overflow-hidden rounded-md border border-line-soft">
          <table className="w-full text-[11.5px]">
            <thead>
              <tr className="bg-white/[0.02] text-left">
                <th className="h-7 px-2.5 font-mono text-[10px] font-medium tracking-[0.06em] text-fg-4 uppercase">Попытка</th>
                <th className="h-7 px-2.5 font-mono text-[10px] font-medium tracking-[0.06em] text-fg-4 uppercase">Время</th>
                <th className="h-7 px-2.5 text-right font-mono text-[10px] font-medium tracking-[0.06em] text-fg-4 uppercase">Пауза</th>
                <th className="h-7 px-2.5 text-right font-mono text-[10px] font-medium tracking-[0.06em] text-fg-4 uppercase">Итог</th>
              </tr>
            </thead>
            <tbody>
              {steps.map((s, i) => (
                <tr key={s.id} className="border-t border-line-soft">
                  <td className="h-7 px-2.5 font-mono text-fg-2 nums">
                    {i + 1}/{total}
                  </td>
                  <td className="h-7 px-2.5 font-mono text-fg-3 nums">{formatClock(s.at)}</td>
                  <td className="h-7 px-2.5 text-right font-mono text-fg-4 nums">{s.deltaMs ? formatDelta(s.deltaMs) : "сразу"}</td>
                  <td className={cn("h-7 px-2.5 text-right font-mono", s.status === "error" ? "text-bad" : s.status === "pending" ? "text-ice-300" : "text-ok")}>
                    {s.status === "error" ? "ошибка" : s.status === "pending" ? "ждём" : "ок"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {out ? (
            <p className="flex items-start gap-1 border-t border-line-soft bg-[#06080c] px-2.5 py-1.5 font-mono text-[11px] text-bad/90">
              <CornerDownRight className="mt-[3px] size-3 shrink-0 text-fg-4" />
              {out}
            </p>
          ) : null}
        </div>
      </div>
    </li>
  );
}
