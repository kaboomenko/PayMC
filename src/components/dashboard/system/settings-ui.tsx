"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";

/** Card with a hairline header — the building block of settings pages. */
export function SettingsSection({
  title,
  description,
  aside,
  children,
  className,
  tone = "default",
  id,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  aside?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  tone?: "default" | "danger";
  id?: string;
}) {
  return (
    <section
      id={id}
      className={cn(
        "rounded-xl border bg-surface shadow-raise",
        tone === "danger" ? "border-bad/25" : "border-line",
        className,
      )}
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line-soft px-5 py-4">
        <div className="min-w-0">
          <h2 className={cn("text-sm font-semibold tracking-[-0.01em]", tone === "danger" ? "text-bad" : "text-fg")}>{title}</h2>
          {description ? <p className="mt-0.5 max-w-xl text-[13px] text-fg-3">{description}</p> : null}
        </div>
        {aside ? <div className="flex shrink-0 items-center gap-2">{aside}</div> : null}
      </header>
      <div>{children}</div>
    </section>
  );
}

/** Label + explanation on the left, control on the right. Stacks on mobile. */
export function SettingRow({
  title,
  description,
  control,
  children,
  htmlFor,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  control?: React.ReactNode;
  children?: React.ReactNode;
  htmlFor?: string;
  className?: string;
}) {
  return (
    <div className={cn("border-b border-line-soft px-5 py-4 last:border-0", className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
        <div className="min-w-0 sm:max-w-[60%]">
          {htmlFor ? (
            <label htmlFor={htmlFor} className="text-[13px] font-medium text-fg">
              {title}
            </label>
          ) : (
            <p className="text-[13px] font-medium text-fg">{title}</p>
          )}
          {description ? <div className="mt-1 text-[12.5px] leading-relaxed text-fg-3">{description}</div> : null}
        </div>
        {control ? <div className="flex shrink-0 items-center gap-2 sm:justify-end">{control}</div> : null}
      </div>
      {children ? <div className="mt-3">{children}</div> : null}
    </div>
  );
}

/** Thin strip of numbers divided by hairlines. */
export function StatStrip({
  items,
  className,
}: {
  items: { label: React.ReactNode; value: React.ReactNode; hint?: React.ReactNode; tone?: "default" | "ok" | "warn" | "bad" }[];
  className?: string;
}) {
  return (
    <dl
      className={cn(
        "grid gap-px overflow-hidden rounded-xl border border-line bg-line-soft",
        items.length === 4 ? "grid-cols-2 lg:grid-cols-4" : items.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2",
        className,
      )}
    >
      {items.map((it, i) => (
        <div key={i} className="bg-surface px-4 py-3.5">
          <dt className="label-mono text-fg-3">{it.label}</dt>
          <dd
            className={cn(
              "mt-1.5 font-mono text-lg font-medium tracking-[-0.02em] nums",
              it.tone === "ok" ? "text-ok" : it.tone === "warn" ? "text-warn" : it.tone === "bad" ? "text-bad" : "text-fg",
            )}
          >
            {it.value}
          </dd>
          {it.hint ? <dd className="mt-0.5 text-[12px] leading-snug text-fg-3">{it.hint}</dd> : null}
        </div>
      ))}
    </dl>
  );
}

/** Sticky bar that slides in when a form has unsaved changes. */
export function SaveBar({
  open,
  message,
  onReset,
  onSave,
  saveDisabled,
  saveLabel = "Сохранить",
}: {
  open: boolean;
  message: React.ReactNode;
  onReset: () => void;
  onSave: () => void;
  saveDisabled?: boolean;
  saveLabel?: string;
}) {
  const reduce = useReducedMotion();
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: 12 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="sticky bottom-4 z-20 mt-6"
          role="region"
          aria-label="Несохранённые изменения"
        >
          <div className="flex flex-col gap-3 rounded-xl border border-line-strong bg-surface-3 px-4 py-3 shadow-pop sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-2 text-[13px] text-fg-2">
              <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-warn" />
              {message}
            </p>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={onReset}>
                Сбросить
              </Button>
              <Button variant="primary" size="sm" onClick={onSave} disabled={saveDisabled}>
                {saveLabel}
                <Kbd className="hidden border-white/25 bg-white/10 text-white sm:inline-flex">⌘S</Kbd>
              </Button>
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

/** ⌘S / Ctrl+S to save while a form is dirty. */
export function useSaveShortcut(enabled: boolean, onSave: () => void) {
  const ref = React.useRef(onSave);
  React.useEffect(() => {
    ref.current = onSave;
  });
  React.useEffect(() => {
    if (!enabled) return;
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        ref.current();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled]);
}

/** Small inline callout — explanation, not decoration. */
export function Note({
  children,
  tone = "neutral",
  icon,
  className,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "warn" | "bad" | "ok" | "azure";
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex gap-2.5 rounded-lg border px-3 py-2.5 text-[12.5px] leading-relaxed [&_svg]:mt-0.5 [&_svg]:size-3.5 [&_svg]:shrink-0",
        tone === "warn" && "border-warn/20 bg-warn-soft text-fg-2 [&_svg]:text-warn",
        tone === "bad" && "border-bad/20 bg-bad-soft text-fg-2 [&_svg]:text-bad",
        tone === "ok" && "border-ok/20 bg-ok-soft text-fg-2 [&_svg]:text-ok",
        tone === "azure" && "border-azure-500/20 bg-azure-500/[0.07] text-fg-2 [&_svg]:text-azure-300",
        tone === "neutral" && "border-line bg-surface-2 text-fg-3 [&_svg]:text-fg-3",
        className,
      )}
    >
      {icon}
      <div className="min-w-0">{children}</div>
    </div>
  );
}
