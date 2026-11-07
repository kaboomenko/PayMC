"use client";

import * as React from "react";
import { Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMoney, formatNumber } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Kbd } from "@/components/ui/kbd";
import { toast } from "@/components/ui/toaster";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { FinanceMember } from "./types";

export const INSTANT_FEE = 0.005;
const MIN_AMOUNT = 100;

type Destination = "split" | "me";

export function WithdrawDialog({
  open,
  onOpenChange,
  available,
  members,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  available: number;
  members: FinanceMember[];
  onConfirm: (amount: number) => void;
}) {
  const [raw, setRaw] = React.useState(String(available));
  const [dest, setDest] = React.useState<Destination>("split");
  const [touched, setTouched] = React.useState(false);

  // reset the form every time the dialog opens (state-during-render, no effect)
  const [wasOpen, setWasOpen] = React.useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (open) {
      setRaw(String(available));
      setTouched(false);
    }
  }

  const splitMembers = members.filter((m) => m.splitPct > 0);
  const owner = members.find((m) => m.role === "owner");
  const amount = Number(raw.replace(/[^\d]/g, "")) || 0;
  const fee = Math.round(amount * INSTANT_FEE);
  const net = Math.max(0, amount - fee);

  const error =
    amount === 0
      ? "Введите сумму"
      : amount < MIN_AMOUNT
        ? `Минимум ${formatMoney(MIN_AMOUNT)}`
        : amount > available
          ? `Доступно только ${formatMoney(available)}`
          : null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (error) return;
    onConfirm(amount);
    onOpenChange(false);
    toast.success(`Вывод ${formatMoney(net)} отправлен`, {
      description:
        dest === "split"
          ? `Разделено между ${splitMembers.length} участниками — придёт за 1–3 минуты`
          : `${owner?.payoutDestination ?? "Т-Банк · СБП"} — придёт за 1–3 минуты`,
    });
  }

  const quick = [
    { label: "25 %", value: Math.floor(available * 0.25) },
    { label: "50 %", value: Math.floor(available * 0.5) },
    { label: "Всё", value: available },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[460px]">
        <form onSubmit={submit} noValidate>
          <DialogHeader>
            <DialogTitle>Вывести сейчас</DialogTitle>
            <DialogDescription>Мгновенный вывод — вне расписания. Плановая выплата завтра в 12:00 МСК бесплатна.</DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-5">
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label htmlFor="withdraw-amount" className="text-[13px] font-medium text-fg-2">
                  Сумма
                </label>
                <span className="font-mono text-[11.5px] text-fg-3 nums">доступно {formatMoney(available)}</span>
              </div>
              <div className="relative">
                <input
                  id="withdraw-amount"
                  inputMode="numeric"
                  autoComplete="off"
                  value={amount ? formatNumber(amount) : raw.replace(/[^\d]/g, "")}
                  onChange={(e) => setRaw(e.target.value)}
                  onBlur={() => setTouched(true)}
                  aria-invalid={touched && !!error}
                  aria-describedby="withdraw-amount-msg"
                  className="h-12 w-full rounded-md border border-line bg-surface-2 pr-10 pl-3.5 font-mono text-2xl font-medium tracking-[-0.02em] text-fg nums shadow-[inset_0_1px_2px_rgb(0_0_0/0.25)] transition-[border-color,box-shadow] outline-none hover:border-line-strong focus:border-azure-500/70 focus:shadow-[0_0_0_3px_rgb(51_119_255/0.18)] aria-[invalid=true]:border-bad/60"
                />
                <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 font-mono text-lg text-fg-3">₽</span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <div className="flex gap-1">
                  {quick.map((q) => (
                    <button
                      key={q.label}
                      type="button"
                      onClick={() => {
                        setRaw(String(q.value));
                        setTouched(true);
                      }}
                      className={cn(
                        "h-6 rounded-sm border px-2 font-mono text-[11px] transition-colors",
                        amount === q.value ? "border-azure-500/50 bg-azure-500/10 text-azure-200" : "border-line text-fg-3 hover:border-line-strong hover:text-fg-2",
                      )}
                    >
                      {q.label}
                    </button>
                  ))}
                </div>
                <p id="withdraw-amount-msg" className={cn("text-xs", touched && error ? "text-bad" : "text-fg-4")}>
                  {touched && error ? error : `от ${formatMoney(MIN_AMOUNT)}`}
                </p>
              </div>
            </div>

            <fieldset>
              <legend className="mb-1.5 text-[13px] font-medium text-fg-2">Куда</legend>
              <div role="radiogroup" className="grid gap-2">
                <DestOption
                  checked={dest === "split"}
                  onSelect={() => setDest("split")}
                  title="По распределению"
                  sub={splitMembers.map((m) => `${m.name.split(" ")[0]} ${m.splitPct} %`).join(" · ")}
                  aside={
                    <span className="flex gap-1">
                      {splitMembers.map((m) => (
                        <Avatar key={m.id} name={m.name} size={20} />
                      ))}
                    </span>
                  }
                />
                <DestOption
                  checked={dest === "me"}
                  onSelect={() => setDest("me")}
                  title="Только мне"
                  sub={owner?.payoutDestination ?? "Т-Банк · СБП"}
                  aside={owner ? <Avatar name={owner.name} size={20} /> : null}
                />
              </div>
            </fieldset>

            <dl className="space-y-1.5 rounded-lg border border-line-soft bg-surface-2/60 px-3.5 py-3 text-[13px]">
              <div className="flex justify-between gap-4">
                <dt className="text-fg-3">Сумма</dt>
                <dd className="font-mono text-fg-2 nums">{formatMoney(amount)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-fg-3">Комиссия за мгновенный вывод · 0,5 %</dt>
                <dd className="font-mono text-fg-2 nums">−{formatMoney(fee)}</dd>
              </div>
              <div className="flex justify-between gap-4 border-t border-line-soft pt-1.5">
                <dt className="font-medium text-fg">К зачислению</dt>
                <dd className="font-mono font-medium text-fg nums">{formatMoney(net)}</dd>
              </div>
              <div className="flex items-center gap-1.5 pt-0.5 text-[12px] text-fg-3">
                <Zap className="size-3.5 text-fg-3" />
                Придёт за 1–3 минуты по СБП, даже ночью и в выходные
              </div>
            </dl>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={touched && !!error}>
              Вывести {net ? formatMoney(net) : ""}
              <Kbd className="border-white/25 bg-white/10 text-white">↵</Kbd>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DestOption({
  checked,
  onSelect,
  title,
  sub,
  aside,
}: {
  checked: boolean;
  onSelect: () => void;
  title: string;
  sub: string;
  aside?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onSelect}
      className={cn(
        "flex w-full min-w-0 items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-[border-color,background-color]",
        checked ? "border-azure-500/60 bg-azure-500/[0.07]" : "border-line hover:border-line-strong hover:bg-white/[0.02]",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "flex size-4 shrink-0 items-center justify-center rounded-full border",
          checked ? "border-azure-400 bg-azure-500" : "border-line-strong",
        )}
      >
        {checked ? <span className="size-1.5 rounded-full bg-white" /> : null}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-medium text-fg">{title}</span>
        <span className="block truncate font-mono text-[11.5px] text-fg-3">{sub}</span>
      </span>
      {aside}
    </button>
  );
}
