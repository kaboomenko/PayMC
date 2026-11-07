"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Bell, Plus, Send, Settings2, Trash2, TriangleAlert, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDuration, formatMoney, formatNumber, formatTime, plural, pluralize } from "@/lib/format";
import { NOW_MS } from "@/lib/mock/now";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CopyButton } from "@/components/ui/copy-button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "@/components/ui/toaster";
import { Note } from "./settings-ui";

export interface TelegramPreview {
  sale: { player: string; item: string; amount: number; ms: number; at: string; orderId: string } | null;
  outage: { server: string; since: string; queued: number } | null;
  payout: { amount: number; at: string; members: number } | null;
  digest: { date: string; at: string; revenue: number; orders: number; buyers: number };
  /** paid order amounts over the last 30 days as [amount, count] — for the «≈ N в день» estimate */
  sales30: [number, number][];
}

type EventKey = "sales" | "failures" | "chargebacks" | "payouts" | "digest";

const EVENTS: { key: EventKey; label: string; hint: string }[] = [
  { key: "sales", label: "Продажи", hint: "Каждая покупка от указанной суммы" },
  { key: "failures", label: "Сбои выдачи", hint: "Сервер не ответил, команда не выполнилась, очередь растёт" },
  { key: "chargebacks", label: "Чарджбэки", hint: "Банк оспорил платёж — выданное снимется само" },
  { key: "payouts", label: "Выплаты", hint: "Отправлена, зачислена или ушла резервным маршрутом" },
  { key: "digest", label: "Сводка дня в 21:00", hint: "Выручка, заказы, лучший товар и сбои за день" },
];

interface Recipient {
  id: string;
  name: string;
  kind: "chat" | "person";
  /** what this recipient gets; personal DMs follow each person's own notification settings */
  note: string;
  /** where those personal settings live (only for the current user) */
  href?: string;
}

/**
 * The events above go to the team chat. Personal DMs are not configured here: each person picks them in
 * Настройки → Уведомления, so Артём's row mirrors his matrix (Telegram: покупки от 1 000 ₽, сбои, выплаты, сводка).
 */
const INITIAL_RECIPIENTS: Recipient[] = [
  { id: "r2", name: "ArcticMC · Staff", kind: "chat", note: "чат команды · 6 участников · события выше" },
  { id: "r1", name: "Артём Ковалёв", kind: "person", note: "личные · покупки от 1 000 ₽, сбои, выплаты, сводка", href: "/dashboard/settings?tab=notifications" },
  { id: "r3", name: "Никита Лебедев", kind: "person", note: "личные · только сбои выдачи — его настройки" },
];

interface BotSettings {
  events: Record<EventKey, boolean>;
  minSale: string;
  recipients: Recipient[];
}

const INITIAL: BotSettings = {
  events: { sales: true, failures: true, chargebacks: true, payouts: true, digest: true },
  minSale: "250",
  recipients: INITIAL_RECIPIENTS,
};

const RECIPIENT_FORMS: [string, string, string] = ["получатель", "получателя", "получателей"];
const RECIPIENT_DATIVE: [string, string, string] = ["получателю", "получателям", "получателям"];

/** «≈ 34 сообщения в день» for sales from `min` ₽, from the real order amounts of the last 30 days. */
function salesEstimate(sales30: [number, number][], min: number) {
  const total = sales30.reduce((a, [amount, count]) => (amount >= min ? a + count : a), 0);
  const perDay = total / 30;
  if (perDay >= 1) return `≈ ${pluralize(Math.round(perDay), ["сообщение", "сообщения", "сообщений"])} в день`;
  if (total > 0) return `≈ ${pluralize(total, ["сообщение", "сообщения", "сообщений"])} в месяц`;
  return "за 30 дней таких покупок не было";
}

export function TelegramCard({ detail, preview }: { detail: string; preview: TelegramPreview }) {
  const [open, setOpen] = React.useState(false);
  const [saved, setSaved] = React.useState<BotSettings>(INITIAL);
  // the sheet edits a draft: copied from the saved settings on open, committed only by «Сохранить»
  const [draft, setDraft] = React.useState<BotSettings>(INITIAL);
  const bot = detail.split(" · ")[0] || "@arcticmc_paybot";
  const savedMin = Number(saved.minSale) || 0;
  const draftMin = Number(draft.minSale) || 0;
  const draftEnabled = Object.values(draft.events).filter(Boolean).length;
  const removed = saved.recipients.filter((r) => !draft.recipients.some((x) => x.id === r.id));

  function openSheet() {
    setDraft(saved);
    setOpen(true);
  }

  function save() {
    setSaved(draft);
    setOpen(false);
    toast.success("Настройки бота сохранены", {
      description: `${pluralize(draftEnabled, ["событие", "события", "событий"])} для чата · ${pluralize(draft.recipients.length, RECIPIENT_FORMS)}`,
    });
  }

  return (
    <section className="overflow-hidden rounded-xl border border-line bg-surface shadow-raise">
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)]">
        <div className="flex min-w-0 flex-col px-4 py-5 sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <p className="label-mono text-fg-3">Главный канал</p>
            <Badge tone="ok" dot>
              Подключено
            </Badge>
          </div>
          <h2 className="mt-3 text-h3 text-fg">Telegram-бот</h2>
          <p className="mt-2 max-w-md text-[13px] leading-relaxed text-fg-2">
            Продажи, сбои выдачи, чарджбэки и выплаты — в чат команды через секунду после события. Работает без VPN, в отличие от Discord.
          </p>
          <p className="mt-3 font-mono text-[12px] text-fg-3">
            {bot} · {pluralize(saved.recipients.length, RECIPIENT_FORMS)}
          </p>

          <p className="mt-5 label-mono text-fg-4">События для чата команды</p>
          <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Включённые события">
            {EVENTS.map((e) => (
              <li key={e.key}>
                <Badge tone={saved.events[e.key] ? "azure" : "outline"} size="md" className={cn(!saved.events[e.key] && "text-fg-4 line-through")}>
                  {e.key === "sales" ? `Продажи от ${formatMoney(savedMin)}` : e.label}
                </Badge>
              </li>
            ))}
          </ul>

          <div className="mt-5">
            <p className="label-mono text-fg-4">Получатели</p>
            <ul className="mt-2 divide-y divide-line-soft rounded-lg border border-line-soft">
              {saved.recipients.map((r) => (
                <li key={r.id} className="flex flex-col gap-0.5 px-3 py-2 text-[12.5px]">
                  <span className="min-w-0 truncate text-fg-2">{r.name}</span>
                  <span className="min-w-0 text-[12px] text-fg-4">
                    {r.note}
                    {r.href ? (
                      <>
                        {" · "}
                        <Link href={r.href} className="whitespace-nowrap text-azure-300 transition-colors hover:text-azure-200">
                          изменить
                        </Link>
                      </>
                    ) : null}
                  </span>
                </li>
              ))}
              {saved.recipients.length === 0 ? <li className="px-3 py-2 text-[12.5px] text-warn">Никто не получает уведомления</li> : null}
            </ul>
            <p className="mt-2 text-[12px] leading-relaxed text-fg-4">
              В личку каждый выбирает события сам —{" "}
              <Link href="/dashboard/settings?tab=notifications" className="text-fg-3 underline decoration-line-strong underline-offset-2 hover:text-fg-2">
                Настройки → Уведомления
              </Link>
              .
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-2 lg:mt-auto lg:pt-6">
            <Button variant="primary" size="sm" onClick={openSheet}>
              <Settings2 />
              Настроить
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={saved.recipients.length === 0}
              onClick={() =>
                toast.success("Тестовое сообщение отправлено", {
                  description: `${formatNumber(saved.recipients.length)} ${plural(saved.recipients.length, RECIPIENT_DATIVE)} · обычно доходит за 1 с`,
                })
              }
            >
              <Send />
              Прислать тест
            </Button>
          </div>

          <Note tone="warn" icon={<TriangleAlert />} className="mt-5">
            Discord в России заблокирован: игроки и модераторы без VPN не увидят сообщения. Держите уведомления и роли в Telegram и VK, а Discord — для
            сообществ за рубежом.
          </Note>
        </div>

        <ChatPreview preview={preview} minSale={savedMin} events={saved.events} />
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Telegram-бот · {bot}</SheetTitle>
            <SheetDescription>Что присылать в чат команды и кому. Включено событий: {draftEnabled} из 5.</SheetDescription>
          </SheetHeader>
          <SheetBody className="space-y-6">
            <fieldset>
              <legend className="label-mono text-fg-3">События для чата команды</legend>
              <ul className="mt-2 divide-y divide-line-soft rounded-lg border border-line">
                {EVENTS.map((e) => (
                  <li key={e.key} className="flex items-start gap-3 px-3.5 py-3">
                    <Checkbox
                      id={`tg-${e.key}`}
                      checked={draft.events[e.key]}
                      onCheckedChange={(v) => setDraft((d) => ({ ...d, events: { ...d.events, [e.key]: v === true } }))}
                      className="mt-0.5"
                    />
                    <div className="min-w-0 flex-1">
                      <label htmlFor={`tg-${e.key}`} className="text-[13px] font-medium text-fg">
                        {e.label}
                      </label>
                      <p className="text-[12px] text-fg-3">{e.hint}</p>
                      {e.key === "sales" && draft.events.sales ? (
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <label htmlFor="tg-min" className="text-[12px] text-fg-3">
                            от
                          </label>
                          <div className="relative w-28">
                            <Input
                              id="tg-min"
                              inputMode="numeric"
                              value={draft.minSale}
                              onChange={(ev) => setDraft((d) => ({ ...d, minSale: ev.target.value.replace(/[^\d]/g, "").slice(0, 6) }))}
                              className="h-8 pr-7 font-mono text-[13px]"
                            />
                            <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 font-mono text-[12px] text-fg-4">₽</span>
                          </div>
                          <span className="text-[12px] text-fg-4" aria-live="polite">
                            {salesEstimate(preview.sales30, draftMin)}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </fieldset>

            <fieldset>
              <legend className="label-mono text-fg-3">Получатели</legend>
              <ul className="mt-2 divide-y divide-line-soft rounded-lg border border-line">
                {draft.recipients.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] text-fg">{r.name}</p>
                      <p className="text-[12px] text-fg-3">{r.note}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label={`Убрать ${r.name}`}
                      onClick={() => setDraft((d) => ({ ...d, recipients: d.recipients.filter((x) => x.id !== r.id) }))}
                    >
                      <Trash2 />
                    </Button>
                  </li>
                ))}
                {removed.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                    <p className="min-w-0 truncate text-[13px] text-fg-4 line-through">{r.name}</p>
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => setDraft((d) => ({ ...d, recipients: saved.recipients.filter((x) => x.id === r.id || d.recipients.some((y) => y.id === x.id)) }))}
                    >
                      <Undo2 />
                      Вернуть
                    </Button>
                  </li>
                ))}
                {draft.recipients.length === 0 && removed.length === 0 ? (
                  <li className="px-3.5 py-3 text-[12.5px] text-fg-3">Никто не получает уведомления — добавьте хотя бы себя.</li>
                ) : null}
              </ul>
              <Link
                href="/dashboard/settings?tab=notifications"
                className="mt-2 inline-flex items-center gap-1 text-[12px] text-fg-3 transition-colors hover:text-fg-2"
              >
                Свои личные уведомления — в Настройках
                <ArrowRight className="size-3" />
              </Link>
              <div className="mt-3 rounded-lg border border-dashed border-line-strong px-3.5 py-3">
                <p className="flex items-center gap-1.5 text-[13px] font-medium text-fg">
                  <Plus className="size-3.5" />
                  Добавить получателя
                </p>
                <p className="mt-1 text-[12px] leading-relaxed text-fg-3">
                  Отправьте боту <span className="font-mono text-fg-2">/start</span> и этот код — личка или чат подключатся сами. Код действует 10 минут.
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <code className="rounded-md border border-line bg-surface-2 px-2.5 py-1 font-mono text-[13px] tracking-[0.12em] text-ice-200">PMC-4F2K</code>
                  <CopyButton value="/start PMC-4F2K" label="Скопировать команду" />
                </div>
              </div>
            </fieldset>
          </SheetBody>
          <SheetFooter className="justify-end">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Закрыть
            </Button>
            <Button variant="primary" size="sm" onClick={save}>
              <Bell />
              Сохранить
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </section>
  );
}

function ChatPreview({ preview, minSale, events }: { preview: TelegramPreview; minSale: number; events: Record<EventKey, boolean> }) {
  const minutesDown = preview.outage ? Math.round((NOW_MS - new Date(preview.outage.since).getTime()) / 60_000) : 0;
  const msgs: { key: string; at: string; title: string; body: string; buttons?: string[]; tone: "ok" | "bad" | "azure" | "neutral"; on: boolean }[] = [];
  msgs.push({
    key: "digest",
    at: preview.digest.at,
    title: `Сводка за ${preview.digest.date}`,
    body: `${formatMoney(preview.digest.revenue)} · ${pluralize(preview.digest.orders, ["заказ", "заказа", "заказов"])} · ${pluralize(preview.digest.buyers, ["покупатель", "покупателя", "покупателей"])}. Сбоев выдачи: 0.`,
    tone: "neutral",
    on: events.digest,
  });
  if (preview.sale)
    msgs.push({
      key: "sale",
      at: preview.sale.at,
      title: "Продажа",
      body: `${preview.sale.player} · ${preview.sale.item} · ${formatMoney(preview.sale.amount)} · выдано за ${formatDuration(preview.sale.ms)}`,
      buttons: [`Заказ ${preview.sale.orderId}`, "Игрок"],
      tone: "ok",
      on: events.sales && preview.sale.amount >= minSale,
    });
  if (preview.outage)
    msgs.push({
      key: "outage",
      at: new Date(NOW_MS - 60_000).toISOString(),
      title: "Сбой",
      body: `${preview.outage.server} не на связи ${minutesDown} мин, в очереди ${pluralize(preview.outage.queued, ["заказ", "заказа", "заказов"])}. Выдадим автоматически, как только сервер ответит.`,
      buttons: ["Очередь сервера"],
      tone: "bad",
      on: events.failures,
    });
  if (preview.payout)
    msgs.push({
      key: "payout",
      at: preview.payout.at,
      title: "Выплата",
      body: `${formatMoney(preview.payout.amount)} отправлено по СБП ${formatNumber(preview.payout.members)} ${plural(preview.payout.members, RECIPIENT_DATIVE)} · обычно 1–3 мин`,
      tone: "azure",
      on: events.payouts,
    });

  const visible = msgs.filter((m) => m.on);

  return (
    <div className="relative min-w-0 border-t border-line bg-canvas lg:border-t-0 lg:border-l">
      <div className="flex items-center gap-2.5 border-b border-line-soft px-4 py-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-azure-600 font-mono text-[11px] font-semibold text-white">PM</span>
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-fg">ArcticMC Pay</p>
          <p className="truncate text-[11.5px] text-fg-3">бот · {visible.length ? "чат команды" : "молчит — все события выключены"}</p>
        </div>
        <span className="ml-auto shrink-0 label-mono text-fg-4">превью</span>
      </div>
      <ol className="space-y-2.5 bg-[radial-gradient(rgb(148_166_204/0.07)_1px,transparent_1px)] [background-size:14px_14px] px-4 py-4" aria-label="Пример сообщений бота">
        {visible.map((m) => (
          <li key={m.key} className="max-w-[92%]">
            <div className="rounded-lg rounded-tl-sm border border-line bg-surface-3 px-3 py-2 shadow-raise">
              <p
                className={cn(
                  "text-[12.5px] font-semibold",
                  m.tone === "ok" ? "text-ok" : m.tone === "bad" ? "text-bad" : m.tone === "azure" ? "text-azure-300" : "text-fg",
                )}
              >
                {m.title}
              </p>
              <p className="mt-0.5 text-[12.5px] leading-relaxed text-fg-2">{m.body}</p>
              <p className="mt-1 text-right font-mono text-[11px] text-fg-4 nums">{formatTime(m.at)}</p>
            </div>
            {m.buttons ? (
              <div className="mt-1 grid auto-cols-fr grid-flow-col gap-1">
                {m.buttons.map((b) => (
                  <span key={b} className="truncate rounded-md border border-line bg-surface-2 px-2 py-1.5 text-center text-[11.5px] text-azure-200">
                    {b}
                  </span>
                ))}
              </div>
            ) : null}
          </li>
        ))}
        {visible.length === 0 ? (
          <li className="py-10 text-center text-[12.5px] text-fg-3">Включите хотя бы одно событие — пример сообщения появится здесь.</li>
        ) : null}
      </ol>
    </div>
  );
}
