"use client";

import * as React from "react";
import { motion, useReducedMotion } from "motion/react";
import { Check, CircleAlert, Clock3, CornerDownRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/format";
import type { ConsoleLine, ConsoleTone, DryRunResult } from "./dry-run";

/** Header indicator per finished run: a run that executed nothing must not look green. */
const RESULT: Record<DryRunResult["status"], { label: string; dot: string }> = {
  ok: { label: "готово", dot: "bg-ok" },
  deferred: { label: "ждёт входа", dot: "bg-ice-400" },
  error: { label: "ошибка", dot: "bg-bad" },
  offline: { label: "не выполнено", dot: "bg-warn" },
  empty: { label: "не выполнено", dot: "bg-warn" },
};

const TONE: Record<ConsoleTone, string> = {
  fg: "text-fg-2",
  muted: "text-fg-4",
  ok: "text-ok",
  ice: "text-ice-300/90",
  bad: "text-bad",
  warn: "text-warn",
};

/**
 * Terminal-style console that reveals lines one by one (time-compressed).
 * Change `runKey` to replay. Respects prefers-reduced-motion.
 */
export function DeliveryConsole({
  lines,
  runKey,
  title = "Консоль сервера",
  className,
  onDone,
  idle,
  status,
}: {
  lines: ConsoleLine[];
  runKey: number;
  /** result of the run — drives the header indicator once all lines are shown */
  status?: DryRunResult["status"];
  title?: React.ReactNode;
  className?: string;
  onDone?: () => void;
  /** shown before the first run */
  idle?: React.ReactNode;
}) {
  const reduce = useReducedMotion();
  const [visible, setVisible] = React.useState(0);
  const [prevKey, setPrevKey] = React.useState(runKey);
  const listRef = React.useRef<HTMLDivElement>(null);
  const doneRef = React.useRef(onDone);
  React.useEffect(() => {
    doneRef.current = onDone;
  });

  // restart on a new run (state-during-render, no effect cascade)
  if (prevKey !== runKey) {
    setPrevKey(runKey);
    setVisible(0);
  }

  React.useEffect(() => {
    if (runKey === 0) return;
    if (reduce) {
      const t = window.setTimeout(() => {
        setVisible(lines.length);
        doneRef.current?.();
      }, 0);
      return () => window.clearTimeout(t);
    }
    const timers: number[] = [];
    let t = 80;
    lines.forEach((l, i) => {
      t += l.wait;
      timers.push(window.setTimeout(() => setVisible(i + 1), t));
    });
    timers.push(window.setTimeout(() => doneRef.current?.(), t + 120));
    return () => timers.forEach((x) => window.clearTimeout(x));
  }, [runKey, lines, reduce]);

  React.useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: reduce ? "auto" : "smooth" });
  }, [visible, reduce]);

  const running = runKey > 0 && visible < lines.length;
  const result = runKey > 0 && !running ? RESULT[status ?? "ok"] : null;

  return (
    <div className={cn("overflow-hidden rounded-lg border border-line bg-[#06080c]", className)}>
      <div className="flex h-8 items-center justify-between border-b border-line-soft px-3">
        <span className="label-mono text-fg-4">{title}</span>
        <span className="flex items-center gap-1.5 font-mono text-[11px] text-fg-4">
          <span className={cn("size-1.5 rounded-full", running ? "animate-pulse-dot bg-ice-400 text-ice-400" : (result?.dot ?? "bg-fg-4"))} />
          {running ? "выполняется" : (result?.label ?? "ожидание")}
        </span>
      </div>
      <div
        ref={listRef}
        className="max-h-[300px] min-h-[132px] overflow-y-auto px-3 py-2.5 font-mono text-[11.5px] leading-[1.65]"
        aria-live="polite"
      >
        {runKey === 0 ? (
          <div className="flex min-h-[110px] items-center text-fg-4">{idle ?? <span className="animate-blink">▌</span>}</div>
        ) : (
          <>
            {lines.slice(0, visible).map((l) => (
              <ConsoleRow key={`${runKey}-${l.id}`} line={l} animate={!reduce} />
            ))}
            {running ? <span className="animate-blink text-fg-3">▌</span> : null}
          </>
        )}
      </div>
    </div>
  );
}

function ConsoleRow({ line, animate }: { line: ConsoleLine; animate: boolean }) {
  const body = (() => {
    switch (line.kind) {
      case "prompt":
        return (
          <p className="break-all text-fg-3">
            <span className="text-fg-4 select-none">$ </span>
            {line.text}
          </p>
        );
      case "note":
        return <p className={cn("pl-3", TONE[line.tone ?? "muted"])}>{line.text}</p>;
      case "cmd":
        return (
          <p className="mt-1.5 break-all text-fg">
            <span className="text-azure-300 select-none">› </span>
            {line.text}
          </p>
        );
      case "out":
        return (
          <div className="flex items-start gap-2 pl-3">
            <CornerDownRight className="mt-[4px] size-3 shrink-0 text-fg-4" />
            <p className={cn("min-w-0 flex-1 break-words", TONE[line.tone ?? "ice"])}>{line.text}</p>
            {line.ms !== undefined ? <span className="shrink-0 text-fg-4 nums">+{formatDuration(line.ms)}</span> : null}
          </div>
        );
      case "summary": {
        const Icon = line.tone === "ok" ? Check : line.tone === "bad" ? CircleAlert : Clock3;
        return (
          <p
            className={cn(
              "mt-2.5 flex items-start gap-2 border-t border-line-soft pt-2.5 font-sans text-[12.5px] font-medium",
              TONE[line.tone ?? "ok"],
            )}
          >
            <Icon className="mt-[2px] size-3.5 shrink-0" strokeWidth={2.5} />
            {line.text}
          </p>
        );
      }
    }
  })();
  if (!animate) return body;
  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}>
      {body}
    </motion.div>
  );
}
