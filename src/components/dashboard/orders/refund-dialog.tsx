"use client";

import * as React from "react";
import { Undo2 } from "lucide-react";
import { formatMoney, formatNumber } from "@/lib/format";
import { PAYMENT_METHODS } from "@/lib/payments";
import type { PaymentMethod } from "@/lib/mock/types";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, Input, Label } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const REASONS = [
  { value: "wrong_item", label: "Купил не тот товар или режим" },
  { value: "not_delivered", label: "Покупка не пришла" },
  { value: "wrong_nick", label: "Ошибся в нике" },
  { value: "changed_mind", label: "Игрок передумал" },
  { value: "parent", label: "Платил ребёнок без разрешения" },
  { value: "other", label: "Другое" },
] as const;

/** Undo command for a delivery command — what we run to take the purchase back. */
export function revokeFor(command: string): string | null {
  const c = command.trim();
  let m: RegExpMatchArray | null;
  if ((m = c.match(/^lp user (\S+) parent addtemp (\S+)/))) return `lp user ${m[1]} parent removetemp ${m[2]}`;
  if ((m = c.match(/^lp user (\S+) parent add (\S+)/))) return `lp user ${m[1]} parent remove ${m[2]}`;
  if ((m = c.match(/^lp user (\S+) permission set (\S+)/))) return `lp user ${m[1]} permission unset ${m[2]}`;
  if ((m = c.match(/^lp user (\S+) meta setprefix/))) return `lp user ${m[1]} meta removeprefix 100`;
  if ((m = c.match(/^points give (\S+) (\d+)/))) return `points take ${m[1]} ${m[2]}`;
  if ((m = c.match(/^excellentcrates key give (\S+) (\S+) (\d+)/))) return `excellentcrates key take ${m[1]} ${m[2]} ${m[3]}`;
  return null;
}

export function RefundDialog({
  open,
  onOpenChange,
  orderId,
  amount,
  method,
  commands,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  amount: number;
  method: PaymentMethod;
  commands: string[];
  onConfirm: (refund: { amount: number; revoke: boolean; reason: string }) => void;
}) {
  const [reason, setReason] = React.useState<string>("wrong_item");
  const [revoke, setRevoke] = React.useState(true);
  const [value, setValue] = React.useState(String(amount));
  const id = React.useId();

  const revokes = commands.map(revokeFor).filter((c): c is string => Boolean(c));
  const parsed = Number(value.replace(/\s/g, "").replace(",", "."));
  const error = !value.trim()
    ? "Укажите сумму"
    : !Number.isFinite(parsed) || parsed <= 0
      ? "Сумма должна быть больше нуля"
      : parsed > amount
        ? `Не больше суммы заказа — ${formatMoney(amount)}`
        : null;
  const partial = !error && parsed < amount;
  const instant = method === "sbp";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (error) return;
            onConfirm({ amount: Math.round(parsed), revoke: revoke && revokes.length > 0, reason: REASONS.find((r) => r.value === reason)?.label ?? "" });
          }}
        >
          <DialogHeader>
            <DialogTitle>Вернуть деньги по заказу {orderId}</DialogTitle>
            <DialogDescription>
              {instant ? "Оплата по СБП — деньги вернутся игроку за пару минут." : `${PAYMENT_METHODS[method].label}: возврат дойдёт за 1–3 рабочих дня.`}
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <Field label="Причина" htmlFor={`${id}-reason`}>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger id={`${id}-reason`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REASONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field
              label="Сумма возврата"
              htmlFor={`${id}-amount`}
              error={error}
              hint={partial ? `Частичный возврат — игрок оставит покупку, вернём ${formatMoney(Math.round(parsed))}` : "Полный возврат суммы, которую заплатил игрок"}
              aside={
                <button type="button" onClick={() => setValue(String(amount))} className="text-xs text-azure-300 hover:text-azure-200">
                  Вся сумма
                </button>
              }
            >
              <Input
                id={`${id}-amount`}
                inputMode="decimal"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                aria-invalid={Boolean(error)}
                trailing={<span className="pr-1 font-mono text-xs text-fg-3">₽</span>}
                className="[&_input]:font-mono [&_input]:nums"
              />
            </Field>

            <div className="rounded-lg border border-line bg-surface-2/60 p-3">
              <div className="flex items-start gap-2.5">
                <Checkbox
                  id={`${id}-revoke`}
                  checked={revoke && revokes.length > 0}
                  disabled={revokes.length === 0}
                  onCheckedChange={(v) => setRevoke(v === true)}
                  className="mt-0.5"
                />
                <div className="min-w-0 flex-1">
                  <Label htmlFor={`${id}-revoke`} className="cursor-pointer text-fg">
                    Снять выданное командами отмены
                  </Label>
                  <p className="mt-0.5 text-xs text-fg-3">
                    {revokes.length
                      ? "Агент выполнит на сервере обратные команды — сразу или при следующем входе игрока."
                      : "Для этого товара нет обратной команды: предметы уже в инвентаре игрока."}
                  </p>
                </div>
              </div>
              {revokes.length && revoke ? (
                <div className="mt-2.5 rounded-md border border-line-soft bg-[#06080c] px-2.5 py-1.5 font-mono text-[11.5px] leading-[1.6] text-fg-2">
                  {revokes.map((c) => (
                    <p key={c} className="break-all">
                      <span className="text-fg-4 select-none">$ </span>
                      {c}
                    </p>
                  ))}
                </div>
              ) : null}
            </div>
          </DialogBody>
          <DialogFooter>
            <span className="mr-auto hidden font-mono text-[11px] text-fg-4 sm:inline">
              {error ? "" : `к возврату ${formatNumber(Math.round(parsed))} ₽`}
            </span>
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" variant="danger" size="sm" disabled={Boolean(error)}>
              <Undo2 /> Вернуть {error ? "" : formatMoney(Math.round(parsed))}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
