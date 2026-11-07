"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { BadgeCheck, Check, ChevronDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";
import type { SetupStep } from "./types";

type VerifyState = "todo" | "sending" | "review";

export function SetupBanner({ steps }: { steps: SetupStep[] }) {
  const reduce = useReducedMotion();
  const [open, setOpen] = React.useState(false);
  const [verify, setVerify] = React.useState<VerifyState>("todo");
  const done = steps.filter((s) => s.done).length;
  const next = steps.find((s) => !s.done);
  const panelId = React.useId();

  const sendForReview = () => {
    setVerify("sending");
    window.setTimeout(() => {
      setVerify("review");
      toast.success("Проект отправлен на проверку", {
        description: "Обычно это 1 рабочий день. Значок появится на витрине сам",
        action: { label: "Отозвать", onClick: () => setVerify("todo") },
      });
    }, 700);
  };

  if (!next) return null;

  return (
    <section aria-label="Настройка проекта" className="mb-4 overflow-hidden rounded-xl border border-line bg-surface shadow-raise">
      <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:gap-4 sm:px-5">
        <div className="flex min-w-0 flex-1 items-center gap-3.5">
          <div className="flex shrink-0 gap-[3px]" aria-hidden>
            {steps.map((s) => (
              <span key={s.id} className={cn("h-4 w-1.5 rounded-[2px]", s.done ? "bg-azure-500" : verify === "review" ? "bg-ice-400" : "bg-white/[0.1]")} />
            ))}
          </div>
          <p className="min-w-0 text-[13px] leading-snug text-fg-2">
            <span className="font-medium text-fg">Настройка проекта</span>{" "}
            <span className="font-mono text-fg-3 nums">
              {done} из {steps.length}
            </span>
            <span className="text-fg-4"> · </span>
            {verify === "review" ? (
              <span className="text-ice-300">Проверка идёт — значок «Проверено PayMC» появится на витрине сам</span>
            ) : (
              <>
                <span className="text-fg">{next.title}</span>
                <span className="text-fg-3"> — значок «Проверено PayMC» на витрине</span>
              </>
            )}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {verify !== "review" ? (
            <Button size="xs" variant="primary" onClick={sendForReview} disabled={verify === "sending"}>
              {verify === "sending" ? <Loader2 className="animate-spin" /> : <BadgeCheck />}
              Пройти проверку
            </Button>
          ) : null}
          <Button
            size="xs"
            variant="ghost"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? "Свернуть" : "Все шаги"}
            <ChevronDown className={cn("transition-transform duration-200", open && "rotate-180")} />
          </Button>
        </div>
      </div>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            id={panelId}
            key="steps"
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduce ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <ol className="grid gap-px border-t border-line-soft bg-line-soft sm:grid-cols-2 xl:grid-cols-4">
              {steps.map((s, i) => (
                <li key={s.id} className={cn("flex items-start gap-2.5 bg-surface px-4 py-3 sm:px-5", !s.done && "bg-surface-2 sm:col-span-2")}>
                  <span
                    className={cn(
                      "mt-px flex size-4 shrink-0 items-center justify-center rounded-full font-mono text-[11px]",
                      s.done ? "bg-azure-500/15 text-azure-300" : "border border-line-strong text-fg-3",
                    )}
                  >
                    {s.done ? <Check className="size-2.5" strokeWidth={3} /> : i + 1}
                  </span>
                  <span className="min-w-0">
                    <span className={cn("block text-[13px]", s.done ? "text-fg-4 line-through decoration-fg-4/60" : "font-medium text-fg")}>{s.title}</span>
                    <span className="mt-0.5 block text-[11.5px] leading-snug text-fg-4">{s.hint}</span>
                  </span>
                </li>
              ))}
            </ol>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}
