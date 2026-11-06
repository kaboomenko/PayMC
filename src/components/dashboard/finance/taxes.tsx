"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Check, CircleAlert, ExternalLink, FileCheck2, Link2, Hourglass, Loader2, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMoney, formatMoneyCompact, formatNumber, formatPercent, formatRelative, pluralize } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Switch } from "@/components/ui/switch";
import { Table, TableWrap, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { toast } from "@/components/ui/toaster";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { ReceiptRow, TaxInfo } from "./types";

export function TaxesPanel({ tax, receipts, now }: { tax: TaxInfo; receipts: ReceiptRow[]; now: number }) {
  const [wizardOpen, setWizardOpen] = React.useState(false);
  const pct = (tax.yearIncome / tax.limit) * 100;
  const projPct = (tax.projected / tax.limit) * 100;
  const tone = projPct >= 95 ? "warn" : projPct >= 80 ? "azure" : "ok";

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-line bg-surface shadow-raise">
        <div className="flex flex-wrap items-start justify-between gap-4 px-5 pt-5">
          <div>
            <p className="label-mono text-fg-3">Лимит самозанятого · 2026</p>
            <p className="mt-2 font-mono text-[30px] leading-none font-medium tracking-[-0.03em] text-fg nums">
              {formatMoney(tax.yearIncome)}
              <span className="ml-2 text-[15px] tracking-normal text-fg-3">из {formatMoneyCompact(tax.limit)}</span>
            </p>
            <p className="mt-2 text-[13px] text-fg-3">
              Ваша доля — {formatPercent(tax.ownerShare * 100, { digits: 0 })} выплат. У остальных участников лимит считается отдельно.
            </p>
          </div>
          <Badge tone={tone === "warn" ? "warn" : tone} size="md">
            {formatPercent(pct)} лимита
          </Badge>
        </div>

        {/* limit bar with 80 % / 95 % markers and the year-end projection */}
        <div className="px-5 pt-6 pb-2">
          <div className="relative h-3 rounded-full bg-white/[0.06]">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-[repeating-linear-gradient(135deg,rgb(243_184_77/0.4)_0_4px,transparent_4px_8px)]"
              style={{ width: `${Math.min(100, projPct)}%` }}
            />
            <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-azure-600 to-azure-400" style={{ width: `${Math.min(100, pct)}%` }} />
            {[80, 95].map((m) => (
              <span key={m} aria-hidden className="absolute -top-1.5 -bottom-1.5 w-px bg-fg-3" style={{ left: `${m}%` }} />
            ))}
          </div>
          <div className="relative mt-2 h-9 font-mono text-[10.5px]">
            <span className="absolute left-0 text-fg-4">0 ₽</span>
            <span className="absolute -translate-x-1/2 text-center text-fg-3" style={{ left: "80%" }}>
              80 %
              <span className="hidden text-fg-4 sm:block">{formatMoneyCompact(tax.limit * 0.8)}</span>
            </span>
            <span className="absolute -translate-x-1/2 text-center text-warn" style={{ left: "95%" }}>
              95 %
              <span className="hidden text-fg-4 sm:block">{formatMoneyCompact(tax.limit * 0.95)}</span>
            </span>
          </div>
        </div>

        <div className="mx-5 mb-5 flex gap-2.5 rounded-lg border border-warn/20 bg-warn-soft px-3.5 py-3">
          <CircleAlert className="mt-0.5 size-4 shrink-0 text-warn" />
          <div className="text-[13px] leading-relaxed text-fg-2">
            При текущем темпе к 31 декабря —{" "}
            <span className="font-mono font-medium text-fg nums">{formatMoney(Math.round(tax.projected / 1000) * 1000)}</span> (
            <span className="font-mono nums">{formatPercent(projPct)}</span> лимита).{" "}
            <span className="text-fg-3">
              Считаем по среднему за 4 недели: ≈ {formatMoney(tax.avgDailyIncome)} вашей доли в день, осталось {pluralize(tax.daysLeft, ["день", "дня", "дней"])}. Чёрная
              пятница и новогодний ивент могут добавить сверху.
            </span>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <MiniStat label="Чеков в 2026" value={formatNumber(tax.receiptsIssued)} hint="на каждый платёж, отправлены игрокам" />
        <MiniStat
          label="Регистрируются"
          value={String(tax.receiptsPending)}
          hint={tax.receiptsPending ? "оплаты последней минуты — в «Мой налог» за 1–2 с" : "все чеки уже в «Мой налог»"}
          live={tax.receiptsPending > 0}
        />
        <MiniStat label="Налог за октябрь" value={formatMoney(tax.taxDue)} hint={`${tax.rate} % с дохода от физлиц · оплатить до 28 ноября`} />
        <div className="rounded-xl border border-line bg-surface px-4 py-3.5 shadow-raise">
          <p className="label-mono text-fg-3">«Мой налог»</p>
          <p className="mt-1.5 flex items-center gap-2 text-[15px] font-medium text-fg">
            <span className="size-2 rounded-full bg-ok" aria-hidden />
            Подключено
          </p>
          <p className="mt-0.5 text-[12px] leading-snug text-fg-3">партнёрский доступ ФНС · 0 ошибок за 30 дней</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-12">
        <section className="min-w-0 rounded-xl border border-line bg-surface shadow-raise lg:col-span-8">
          <header className="flex items-start justify-between gap-3 border-b border-line-soft px-4 py-3.5 sm:px-5">
            <div className="min-w-0">
              <h2 className="text-sm font-medium text-fg">Последние чеки</h2>
              <p className="mt-0.5 text-[12.5px] text-fg-3">Чек формируется в момент оплаты и уходит игроку на почту — обычно за 1–2 с.</p>
            </div>
            <Button asChild variant="ghost" size="xs" className="shrink-0">
              <Link href="/dashboard/orders">
                Все заказы <ArrowRight />
              </Link>
            </Button>
          </header>
          {receipts.length === 0 ? (
            <EmptyState icon={<Receipt />} title="Чеков пока нет" description="Первый чек появится здесь сразу после первой оплаты." />
          ) : (
            <>
            {/* phones: stacked rows so the status never scrolls off-screen */}
            <ul className="md:hidden">
              {receipts.map((r) => (
                <li key={r.orderId} className="border-b border-line-soft px-4 py-3 last:border-0">
                  <div className="flex items-center justify-between gap-3">
                    <Link href={`/dashboard/orders?id=${r.orderId}`} className="group flex min-w-0 items-baseline gap-2">
                      <span className="font-mono text-[12.5px] whitespace-nowrap text-fg group-hover:text-azure-200">{r.number ? `№ ${r.number}` : r.orderId}</span>
                      <span className="truncate font-mono text-[11.5px] text-fg-4 nums">{formatRelative(r.at, now)}</span>
                    </Link>
                    <span className="shrink-0 font-mono text-[13px] text-fg nums">{formatMoney(r.amount)}</span>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between gap-3">
                    <span className="min-w-0 truncate text-[12.5px] text-fg-2">
                      {r.item} <span className="text-fg-4">· {r.player}</span>
                    </span>
                    <ReceiptStatus status={r.status} />
                  </div>
                  {r.awaitingDelivery ? <AwaitingDelivery orderId={r.orderId} className="mt-2" /> : null}
                </li>
              ))}
            </ul>
            <TableWrap className="hidden md:block">
              <Table>
                <THead>
                  <TR>
                    <TH>Чек</TH>
                    <TH>Когда</TH>
                    <TH>Покупка</TH>
                    <TH className="text-right">Сумма</TH>
                    <TH>Статус</TH>
                  </TR>
                </THead>
                <TBody>
                  {receipts.map((r) => (
                    <TR key={r.orderId}>
                      <TD>
                        <Link href={`/dashboard/orders?id=${r.orderId}`} className="group flex flex-col">
                          <span className="font-mono text-[12.5px] whitespace-nowrap text-fg group-hover:text-azure-200">{r.number ? `№ ${r.number}` : "—"}</span>
                          <span className="font-mono text-[11px] text-fg-4">{r.orderId}</span>
                        </Link>
                      </TD>
                      <TD className="font-mono text-[12px] whitespace-nowrap text-fg-3 nums">{formatRelative(r.at, now)}</TD>
                      <TD>
                        <span className="block max-w-[220px] truncate text-fg-2">{r.item}</span>
                        <span className="block text-[11.5px] text-fg-4">{r.player}</span>
                      </TD>
                      <TD className="text-right font-mono text-fg nums">{formatMoney(r.amount)}</TD>
                      <TD>
                        <div className="flex flex-col items-start gap-1">
                          <ReceiptStatus status={r.status} />
                          {r.awaitingDelivery ? <AwaitingDelivery orderId={r.orderId} /> : null}
                        </div>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </TableWrap>
            </>
          )}
        </section>

        <section className="flex min-w-0 flex-col rounded-xl border border-line bg-surface shadow-raise lg:col-span-4">
          <div className="border-b border-line-soft bg-[linear-gradient(180deg,rgb(243_184_77/0.06),transparent)] px-5 py-4">
            <p className="label-mono text-warn">Скоро упрётесь в лимит</p>
            <h2 className="mt-1.5 text-[15px] font-medium text-fg">Подходите к лимиту? Мастер перехода на ИП</h2>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-fg-3">
              После 2,4 млн ₽ статус самозанятого слетает, а налог с превышения считается по ставке ИП. Переход занимает около недели — лучше начать до 95 %.
            </p>
          </div>
          <ol className="flex-1 space-y-2.5 px-5 py-4 text-[12.5px]">
            {["Регистрация ИП онлайн — 3 рабочих дня", "УСН «Доходы» 6 % — уведомление в течение 20 дней", "Облачная касса и чеки по 54-ФЗ — подключим сами", "Выплаты на расчётный счёт — история сохранится"].map(
              (s, i) => (
                <li key={s} className="flex gap-2.5">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full border border-line-strong font-mono text-[10.5px] text-fg-3">
                    {i + 1}
                  </span>
                  <span className="text-fg-2">{s}</span>
                </li>
              ),
            )}
          </ol>
          <div className="border-t border-line-soft px-5 py-3">
            <Button variant="secondary" size="sm" className="w-full" onClick={() => setWizardOpen(true)}>
              Открыть мастер
              <ArrowRight />
            </Button>
          </div>
        </section>
      </div>

      <IpWizard open={wizardOpen} onOpenChange={setWizardOpen} projected={tax.projected} />
    </div>
  );
}

function ReceiptStatus({ status }: { status: ReceiptRow["status"] }) {
  return status === "sent" ? (
    <Badge tone="ok" className="shrink-0">
      <Check />
      Зарегистрирован
    </Badge>
  ) : (
    <Badge tone="azure" className="shrink-0">
      <Loader2 className="animate-spin" />
      Регистрируется
    </Badge>
  );
}

/** Delivery problems are about the order, not the receipt — shown apart, with a way to the order. */
function AwaitingDelivery({ orderId, className }: { orderId: string; className?: string }) {
  return (
    <Link
      href={`/dashboard/orders?id=${orderId}`}
      className={cn("inline-flex items-center gap-1 text-[11.5px] whitespace-nowrap text-warn transition-colors hover:text-fg", className)}
    >
      <Hourglass className="size-3" />
      Заказ ждёт выдачи
      <ArrowRight className="size-3" />
    </Link>
  );
}

function MiniStat({ label, value, hint, live }: { label: string; value: string; hint: string; live?: boolean }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-4 py-3.5 shadow-raise">
      <p className="flex items-center gap-1.5 label-mono text-fg-3">
        {label}
        {live ? <span aria-hidden className="size-1.5 animate-pulse-dot rounded-full bg-azure-400 text-azure-400" /> : null}
      </p>
      <p className="mt-1.5 font-mono text-lg font-medium tracking-[-0.02em] text-fg nums">{value}</p>
      <p className="mt-0.5 text-[12px] leading-snug text-fg-3">{hint}</p>
    </div>
  );
}

const STEPS = [
  {
    title: "Зарегистрируйте ИП",
    body: "Через Госуслуги или приложение банка — онлайн и без госпошлины, обычно за 3 рабочих дня. Коды ОКВЭД: 47.91 (продажи через интернет) и 63.11 (обработка данных).",
    meta: "3 рабочих дня · 0 ₽",
  },
  {
    title: "Выберите УСН «Доходы» 6 %",
    body: "Уведомление о переходе на УСН подайте в течение 20 дней после снятия с учёта как самозанятого — иначе по умолчанию останется ОСНО.",
    meta: "20 дней на уведомление",
  },
  {
    title: "Подключите облачную кассу",
    body: "Чеки по 54-ФЗ PayMC формирует сам через облачную кассу и ОФД — покупать оборудование не нужно. Игроки продолжат получать чек на почту.",
    meta: "1 день · входит в тариф",
  },
  {
    title: "Перенесите выплаты на расчётный счёт",
    body: "Укажите счёт ИП — выплаты пойдут туда с ближайших 12:00. Отчёты агента и акты сверки будут приходить на ИП, история прошлых периодов останется.",
    meta: "5 минут",
  },
];

function IpWizard({ open, onOpenChange, projected }: { open: boolean; onOpenChange: (v: boolean) => void; projected: number }) {
  const [step, setStep] = React.useState(0);
  const [remind, setRemind] = React.useState(true);
  const [wasOpen, setWasOpen] = React.useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (open) setStep(0);
  }
  const last = step === STEPS.length - 1;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Переход с самозанятости на ИП</DialogTitle>
          <DialogDescription>
            Прогноз дохода на конец года — {formatMoney(Math.round(projected / 1000) * 1000)}. Четыре шага, PayMC закрывает два из них.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <ol className="grid grid-cols-4 gap-1.5" aria-label="Шаги">
            {STEPS.map((s, i) => (
              <li key={s.title}>
                <button
                  type="button"
                  onClick={() => setStep(i)}
                  aria-current={i === step ? "step" : undefined}
                  className="group w-full text-left"
                >
                  <span className={cn("block h-1 rounded-full transition-colors", i <= step ? "bg-azure-500" : "bg-white/[0.08] group-hover:bg-white/[0.14]")} />
                  <span className={cn("mt-1.5 block font-mono text-[10.5px]", i === step ? "text-fg-2" : "text-fg-4")}>Шаг {i + 1}</span>
                </button>
              </li>
            ))}
          </ol>
          <div className="mt-4 min-h-[148px] rounded-lg border border-line-soft bg-surface-2/60 px-4 py-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-[15px] font-medium text-fg">{STEPS[step].title}</h3>
              <span className="font-mono text-[11.5px] text-fg-3">{STEPS[step].meta}</span>
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-fg-2">{STEPS[step].body}</p>
            {step === 0 ? (
              <a
                href="https://www.gosuslugi.ru"
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] text-azure-300 hover:text-azure-200"
              >
                <Link2 className="size-3.5" />
                Регистрация ИП на Госуслугах
                <ExternalLink className="size-3" />
              </a>
            ) : null}
            {step === 2 ? (
              <p className="mt-3 flex items-center gap-1.5 text-[12.5px] text-ok">
                <FileCheck2 className="size-3.5" />
                Делает PayMC: касса, ОФД и формат чеков
              </p>
            ) : null}
          </div>
          <label className="mt-4 flex items-center justify-between gap-3 text-[13px] text-fg-2">
            <span>
              Напомнить при 90 % лимита
              <span className="block text-[12px] text-fg-3">В Telegram и на почту владельцу</span>
            </span>
            <Switch checked={remind} onCheckedChange={setRemind} aria-label="Напомнить при 90 % лимита" />
          </label>
        </DialogBody>
        <DialogFooter className="justify-between">
          <Button variant="ghost" size="sm" onClick={() => (step ? setStep(step - 1) : onOpenChange(false))}>
            {step ? "Назад" : "Позже"}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              if (!last) return setStep(step + 1);
              onOpenChange(false);
              toast.success("План перехода сохранён", {
                description: remind ? "Напомним при 90 % лимита и пришлём чек-лист на почту" : "Чек-лист отправлен на почту",
              });
            }}
          >
            {last ? "Готово" : "Дальше"}
            {!last ? <ArrowRight /> : <Check />}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
