"use client";

import * as React from "react";
import { Check, FileCheck2, Plus, Scale, UserPlus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateShort, formatMoney, formatTime } from "@/lib/format";
import { memberRoleMeta } from "@/lib/mock/meta";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { toast } from "@/components/ui/toaster";
import { Note, SaveBar, useSaveShortcut } from "@/components/dashboard/system/settings-ui";
import type { FinanceMember, PayoutRow } from "./types";

const SEGMENT = ["bg-azure-500", "bg-ice-400", "bg-azure-200", "bg-fg", "bg-azure-700", "bg-ice-600"];
const TAX_TEXT: Record<NonNullable<FinanceMember["taxStatus"]>, { label: string; hint: string }> = {
  self_employed: { label: "Самозанятый", hint: "чек формируется сам" },
  ip: { label: "ИП", hint: "акт и отчёт агента раз в месяц" },
  individual: { label: "Физлицо", hint: "нужен статус самозанятого или ИП" },
};

interface DraftRow {
  id: string;
  pct: number;
}

export function SplitEditor({
  members,
  lastPayout,
  onSave,
}: {
  members: FinanceMember[];
  lastPayout: PayoutRow | undefined;
  onSave: (next: FinanceMember[]) => void;
}) {
  const savedRows = React.useMemo<DraftRow[]>(() => members.filter((m) => m.splitPct > 0).map((m) => ({ id: m.id, pct: m.splitPct })), [members]);
  const [draft, setDraft] = React.useState<DraftRow[]>(savedRows);
  const [extra, setExtra] = React.useState<Record<string, Pick<FinanceMember, "payoutDestination" | "taxStatus">>>({});
  const [addOpen, setAddOpen] = React.useState(false);

  // adopt new saved state (after save / undo) during render
  const [seenSaved, setSeenSaved] = React.useState(savedRows);
  if (seenSaved !== savedRows) {
    setSeenSaved(savedRows);
    setDraft(savedRows);
  }

  const byId = new Map(members.map((m) => [m.id, { ...m, ...extra[m.id] }]));
  const sum = draft.reduce((a, r) => a + r.pct, 0);
  const valid = sum === 100 && draft.every((r) => r.pct >= 1);
  const dirty = JSON.stringify(draft) !== JSON.stringify(savedRows);
  const amount = lastPayout?.amount ?? 0;
  const candidates = members.filter((m) => !draft.some((r) => r.id === m.id));
  const ownerId = members.find((m) => m.role === "owner")?.id;

  function setPct(id: string, pct: number) {
    const v = Math.max(0, Math.min(100, Math.round(pct)));
    setDraft((rows) => rows.map((r) => (r.id === id ? { ...r, pct: v } : r)));
  }

  function balanceToOwner() {
    if (!ownerId) return;
    const others = draft.filter((r) => r.id !== ownerId).reduce((a, r) => a + r.pct, 0);
    setPct(ownerId, Math.max(1, 100 - others));
  }

  function save() {
    if (!valid || !dirty) return;
    const prev = members;
    const next = members.map((m) => {
      const row = draft.find((r) => r.id === m.id);
      return { ...m, ...extra[m.id], splitPct: row ? row.pct : 0 };
    });
    onSave(next);
    toast.success("Распределение сохранено", {
      description: "Действует со следующей выплаты — завтра в 12:00",
      action: { label: "Отменить", onClick: () => onSave(prev) },
    });
  }

  useSaveShortcut(dirty && valid, save);

  // preview: amounts with rounding remainder going to the owner
  const amounts = draft.map((r) => ({ ...r, amount: Math.floor((amount * r.pct) / 100) }));
  const remainder = sum === 100 ? amount - amounts.reduce((a, r) => a + r.amount, 0) : 0;
  if (remainder && ownerId) {
    const o = amounts.find((r) => r.id === ownerId);
    if (o) o.amount += remainder;
  }

  return (
    <div>
      <div className="grid gap-4 lg:grid-cols-12">
        <section className="rounded-xl border border-line bg-surface shadow-raise lg:col-span-7">
          <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line-soft px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold tracking-[-0.01em] text-fg">Кто получает выплаты</h2>
              <p className="mt-0.5 text-[13px] text-fg-3">Каждая выплата делится по долям. Каждый получает деньги и чек на свою часть.</p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setAddOpen(true)} disabled={candidates.length === 0}>
              <UserPlus />
              Добавить участника
            </Button>
          </header>

          <ul>
            {draft.map((r, i) => {
              const m = byId.get(r.id);
              if (!m) return null;
              const tax = m.taxStatus ? TAX_TEXT[m.taxStatus] : null;
              const inputId = `split-${r.id}`;
              return (
                <li key={r.id} className="grid gap-3 border-b border-line-soft px-5 py-4 last:border-0 md:grid-cols-[minmax(0,1fr)_240px] md:items-center md:gap-6">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="relative">
                      <Avatar name={m.name} size={32} />
                      <span aria-hidden className={cn("absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full ring-2 ring-surface", SEGMENT[i % SEGMENT.length])} />
                    </span>
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px]">
                        <span className="font-medium text-fg">{m.name}</span>
                        <span className="text-fg-4">{memberRoleMeta[m.role].label}</span>
                      </p>
                      <p className="mt-0.5 truncate font-mono text-[11.5px] text-fg-3">{m.payoutDestination ?? "Реквизиты не указаны"}</p>
                      {tax ? (
                        <p className="mt-1 flex items-center gap-1 text-[11.5px] text-fg-3">
                          <FileCheck2 className="size-3 text-ok" />
                          {tax.label} — {tax.hint}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Slider
                      aria-label={`Доля: ${m.name}`}
                      value={[r.pct]}
                      min={0}
                      max={100}
                      step={1}
                      onValueChange={([v]) => setPct(r.id, v)}
                      className="flex-1"
                    />
                    <div className="relative w-[68px] shrink-0">
                      <label htmlFor={inputId} className="sr-only">
                        Доля {m.name}, %
                      </label>
                      <input
                        id={inputId}
                        inputMode="numeric"
                        value={String(r.pct)}
                        onChange={(e) => setPct(r.id, Number(e.target.value.replace(/[^\d]/g, "")) || 0)}
                        onKeyDown={(e) => {
                          if (e.key === "ArrowUp") {
                            e.preventDefault();
                            setPct(r.id, r.pct + (e.shiftKey ? 5 : 1));
                          }
                          if (e.key === "ArrowDown") {
                            e.preventDefault();
                            setPct(r.id, r.pct - (e.shiftKey ? 5 : 1));
                          }
                        }}
                        aria-invalid={r.pct < 1}
                        className="h-8 w-full rounded-md border border-line bg-surface-2 pr-6 pl-2.5 text-right font-mono text-[13px] text-fg nums outline-none hover:border-line-strong focus:border-azure-500/70 focus:shadow-[0_0_0_3px_rgb(51_119_255/0.18)] aria-[invalid=true]:border-bad/60"
                      />
                      <span className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 font-mono text-[12px] text-fg-4">%</span>
                    </div>
                    {r.id !== ownerId ? (
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        aria-label={`Убрать ${m.name} из распределения`}
                        onClick={() => setDraft((rows) => rows.filter((x) => x.id !== r.id))}
                      >
                        <X />
                      </Button>
                    ) : (
                      <span className="size-7 shrink-0" />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          <footer className="flex flex-col gap-3 border-t border-line-soft px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className={cn("flex items-center gap-2 text-[13px]", valid ? "text-fg-2" : "text-bad")} role="status" aria-live="polite">
              {valid ? <Check className="size-4 text-ok" /> : <Scale className="size-4" />}
              Сумма долей: <span className="font-mono font-medium nums">{sum} %</span>
              {!valid ? (
                <span className="text-fg-3">
                  {sum < 100 ? `— распределите ещё ${100 - sum} %` : sum > 100 ? `— лишние ${sum - 100} %` : "— у каждого минимум 1 %"}
                </span>
              ) : null}
            </p>
            {!valid && sum !== 100 ? (
              <Button variant="outline" size="xs" onClick={balanceToOwner}>
                Остаток — владельцу
              </Button>
            ) : null}
          </footer>
        </section>

        <section className="rounded-xl border border-line bg-surface shadow-raise lg:col-span-5">
          <header className="border-b border-line-soft px-5 py-4">
            <p className="label-mono text-fg-3">Предпросмотр</p>
            <h2 className="mt-1.5 text-sm font-semibold tracking-[-0.01em] text-fg">
              Как разделилась бы последняя выплата
            </h2>
            {lastPayout ? (
              <p className="mt-0.5 text-[12.5px] text-fg-3">
                {formatDateShort(lastPayout.createdAt)}, {formatTime(lastPayout.createdAt)} · <span className="font-mono text-fg-2 nums">{formatMoney(amount)}</span>
              </p>
            ) : null}
          </header>
          <div className="px-5 py-4">
            <div className="flex h-3 overflow-hidden rounded-full bg-white/[0.06]" role="img" aria-label="Доли участников">
              {draft.map((r, i) => (
                <div
                  key={r.id}
                  className={cn("h-full transition-[width] duration-200 ease-[var(--ease-snappy)] not-last:border-r not-last:border-surface", SEGMENT[i % SEGMENT.length])}
                  style={{ width: `${(Math.min(r.pct, 100) / Math.max(sum, 100)) * 100}%` }}
                />
              ))}
              {sum < 100 ? (
                <div className="h-full bg-[repeating-linear-gradient(135deg,rgb(243_184_77/0.45)_0_3px,transparent_3px_6px)]" style={{ width: `${100 - sum}%` }} />
              ) : null}
            </div>

            <ul className="mt-4 space-y-2.5">
              {amounts.map((r, i) => {
                const m = byId.get(r.id);
                if (!m) return null;
                return (
                  <li key={r.id} className="flex items-center justify-between gap-3 text-[13px]">
                    <span className="flex min-w-0 items-center gap-2">
                      <span aria-hidden className={cn("size-2 shrink-0 rounded-[2px]", SEGMENT[i % SEGMENT.length])} />
                      <span className="truncate text-fg-2">{m.name}</span>
                      <span className="font-mono text-[12px] text-fg-4 nums">{r.pct} %</span>
                    </span>
                    <span className={cn("font-mono nums", valid ? "text-fg" : "text-fg-3")}>{valid ? formatMoney(r.amount) : "—"}</span>
                  </li>
                );
              })}
              {sum < 100 ? (
                <li className="flex items-center justify-between gap-3 text-[13px]">
                  <span className="flex items-center gap-2 text-warn">
                    <span aria-hidden className="size-2 rounded-[2px] bg-warn/60" />
                    Не распределено
                  </span>
                  <span className="font-mono text-warn nums">{100 - sum} %</span>
                </li>
              ) : null}
            </ul>

            <div className="mt-4 space-y-2">
              <Note>Копейки от округления достаются владельцу. Минимальная доля — 1 %.</Note>
              <Note tone="azure" icon={<FileCheck2 />}>
                Самозанятым чеки на их долю формируются в «Мой налог» автоматически — каждому свой, лимит НПД считается отдельно.
              </Note>
            </div>
          </div>
        </section>
      </div>

      <SaveBar
        open={dirty}
        message={valid ? "Новое распределение начнёт действовать с выплаты 7 ноября в 12:00" : `Сумма долей ${sum} % — должна быть ровно 100 %`}
        onReset={() => setDraft(savedRows)}
        onSave={save}
        saveDisabled={!valid}
      />

      <AddMemberDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        candidates={candidates}
        ownerPct={draft.find((r) => r.id === ownerId)?.pct ?? 0}
        onAdd={({ id, pct, takeFromOwner, destination, taxStatus }) => {
          setExtra((e) => ({ ...e, [id]: { payoutDestination: destination, taxStatus } }));
          setDraft((rows) => {
            const next = rows.map((r) => (takeFromOwner && r.id === ownerId ? { ...r, pct: Math.max(1, r.pct - pct) } : r));
            return [...next, { id, pct }];
          });
        }}
      />
    </div>
  );
}

function AddMemberDialog({
  open,
  onOpenChange,
  candidates,
  ownerPct,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  candidates: FinanceMember[];
  ownerPct: number;
  onAdd: (v: { id: string; pct: number; takeFromOwner: boolean; destination: string; taxStatus: NonNullable<FinanceMember["taxStatus"]> }) => void;
}) {
  const [memberId, setMemberId] = React.useState("");
  const [destination, setDestination] = React.useState("");
  const [tax, setTax] = React.useState<"self_employed" | "ip">("self_employed");
  const [pct, setPct] = React.useState("10");
  const [take, setTake] = React.useState(true);
  const [tried, setTried] = React.useState(false);

  const [wasOpen, setWasOpen] = React.useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (open) {
      setMemberId(candidates[0]?.id ?? "");
      setDestination("");
      setTax("self_employed");
      setPct("10");
      setTake(true);
      setTried(false);
    }
  }

  const pctNum = Number(pct) || 0;
  const digits = destination.replace(/\D/g, "");
  const destError = !digits ? "Укажите телефон для СБП или номер карты" : digits.length === 11 || digits.length === 16 ? null : "Телефон — 11 цифр, карта — 16 цифр";
  const pctError = pctNum < 1 || pctNum > 99 ? "От 1 до 99 %" : take && ownerPct - pctNum < 1 ? `У владельца только ${ownerPct} %` : null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setTried(true);
    if (!memberId || destError || pctError) return;
    const masked = digits.length === 16 ? `Карта •• ${digits.slice(-4)}` : `СБП · +7 9•• •••-${digits.slice(-4, -2)}-${digits.slice(-2)}`;
    onAdd({ id: memberId, pct: pctNum, takeFromOwner: take, destination: masked, taxStatus: tax });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[480px]">
        <form onSubmit={submit} noValidate>
          <DialogHeader>
            <DialogTitle>Добавить участника выплат</DialogTitle>
            <DialogDescription>Доля начнёт действовать после сохранения распределения.</DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <Field label="Участник команды" htmlFor="add-member">
              <Select value={memberId} onValueChange={setMemberId}>
                <SelectTrigger id="add-member">
                  <SelectValue placeholder="Выберите участника" />
                </SelectTrigger>
                <SelectContent>
                  {candidates.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} · {memberRoleMeta[c.role].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field
              label="Куда выплачивать"
              htmlFor="add-dest"
              hint="Телефон для СБП или номер карты Мир"
              error={tried ? destError : null}
            >
              <Input
                id="add-dest"
                inputMode="numeric"
                placeholder="+7 900 000-00-00"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                aria-invalid={tried && !!destError}
                className="font-mono"
              />
            </Field>
            <fieldset>
              <legend className="mb-1.5 text-[13px] font-medium text-fg-2">Налоговый статус</legend>
              <div role="radiogroup" className="grid gap-2 sm:grid-cols-3">
                {(["self_employed", "ip"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    role="radio"
                    aria-checked={tax === t}
                    onClick={() => setTax(t)}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-left transition-colors",
                      tax === t ? "border-azure-500/60 bg-azure-500/[0.07]" : "border-line hover:border-line-strong",
                    )}
                  >
                    <span className="block text-[13px] font-medium text-fg">{TAX_TEXT[t].label}</span>
                    <span className="block text-[11.5px] leading-snug text-fg-3">{TAX_TEXT[t].hint}</span>
                  </button>
                ))}
                <div aria-disabled className="rounded-lg border border-line-soft px-3 py-2 opacity-50">
                  <span className="block text-[13px] font-medium text-fg-2">Физлицо</span>
                  <span className="block text-[11.5px] leading-snug text-fg-3">{TAX_TEXT.individual.hint}</span>
                </div>
              </div>
            </fieldset>
            <div className="grid grid-cols-[96px_1fr] items-start gap-3">
              <Field label="Доля" htmlFor="add-pct" error={tried ? pctError : null}>
                <div className="relative">
                  <Input
                    id="add-pct"
                    inputMode="numeric"
                    value={pct}
                    onChange={(e) => setPct(e.target.value.replace(/[^\d]/g, ""))}
                    aria-invalid={tried && !!pctError}
                    className="pr-7 text-right font-mono"
                  />
                  <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 font-mono text-[12px] text-fg-4">%</span>
                </div>
              </Field>
              <label className="mt-7 flex items-start gap-2 text-[12.5px] text-fg-2">
                <Checkbox checked={take} onCheckedChange={(v) => setTake(v === true)} className="mt-0.5" />
                <span>
                  Взять из доли владельца
                  <span className="block text-fg-3">
                    {take ? `${ownerPct} % → ${Math.max(0, ownerPct - pctNum)} %` : "сумму долей поправите вручную"}
                  </span>
                </span>
              </label>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" variant="primary" size="sm">
              <Plus />
              Добавить
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
