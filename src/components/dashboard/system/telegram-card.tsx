"use client";

import * as React from "react";
import { Bell, Plus, Send, Settings2, Trash2, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDuration, formatMoney, formatNumber, formatTime, pluralize } from "@/lib/format";
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
  kind: string;
}

const INITIAL_RECIPIENTS: Recipient[] = [
  { id: "r1", name: "Артём Ковалёв", kind: "личные сообщения · все события" },
  { id: "r2", name: "ArcticMC · Staff", kind: "чат команды · 6 участников" },
  { id: "r3", name: "Никита Лебедев", kind: "личные сообщения · только сбои" },
];

export function TelegramCard({ detail, preview }: { detail: string; preview: TelegramPreview }) {
  const [open, setOpen] = React.useState(false);
  const [events, setEvents] = React.useState<Record<EventKey, boolean>>({ sales: true, failures: true, chargebacks: true, payouts: true, digest: true });
  const [minSale, setMinSale] = React.useState("250");
  const [recipients, setRecipients] = React.useState(INITIAL_RECIPIENTS);
  const enabledCount = Object.values(events).filter(Boolean).length;

  return (
    <section className="overflow-hidden rounded-xl border border-line bg-surface shadow-raise">
      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,440px)]">
        <div className="flex flex-col px-5 py-5 sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <p className="label-mono text-fg-3">Главный канал</p>
            <Badge tone="ok" dot>
              Подключено
            </Badge>
          </div>
          <h2 className="mt-3 text-h3 text-fg">Telegram-бот</h2>
          <p className="mt-2 max-w-md text-[13px] leading-relaxed text-fg-2">
            Продажи, сбои выдачи, чарджбэки и выплаты — в личку или в чат команды через секунду после события. Работает без VPN, в отличие от Discord.
          </p>
          <p className="mt-3 font-mono text-[12px] text-fg-3">{detail}</p>

          <ul className="mt-5 flex flex-wrap gap-1.5" aria-label="Включённые события">
            {EVENTS.map((e) => (
              <li key={e.key}>
                <Badge tone={events[e.key] ? "azure" : "outline"} size="md" className={cn(!events[e.key] && "text-fg-4 line-through")}>
                  {e.key === "sales" ? `Продажи от ${formatNumber(Number(minSale) || 0)} ₽` : e.label}
                </Badge>
              </li>
            ))}
          </ul>

          <div className="mt-5">
            <p className="label-mono text-fg-4">Получатели</p>
            <ul className="mt-2 divide-y divide-line-soft rounded-lg border border-line-soft">
              {recipients.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 px-3 py-2 text-[12.5px]">
                  <span className="truncate text-fg-2">{r.name}</span>
                  <span className="truncate text-right text-fg-4">{r.kind}</span>
                </li>
              ))}
              {recipients.length === 0 ? <li className="px-3 py-2 text-[12.5px] text-warn">Никто не получает уведомления</li> : null}
            </ul>
          </div>

          <div className="mt-6 flex flex-wrap gap-2 lg:mt-auto lg:pt-6">
            <Button variant="primary" size="sm" onClick={() => setOpen(true)}>
              <Settings2 />
              Настроить
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => toast.success("Тестовое сообщение отправлено", { description: `${recipients.length} получателя · обычно доходит за 1 с` })}
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

        <ChatPreview preview={preview} minSale={Number(minSale) || 0} events={events} />
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Telegram-бот · @arcticmc_paybot</SheetTitle>
            <SheetDescription>Что присылать и кому. Включено событий: {enabledCount} из 5.</SheetDescription>
          </SheetHeader>
          <SheetBody className="space-y-6">
            <fieldset>
              <legend className="label-mono text-fg-3">События</legend>
              <ul className="mt-2 divide-y divide-line-soft rounded-lg border border-line">
                {EVENTS.map((e) => (
                  <li key={e.key} className="flex items-start gap-3 px-3.5 py-3">
                    <Checkbox
                      id={`tg-${e.key}`}
                      checked={events[e.key]}
                      onCheckedChange={(v) => setEvents((s) => ({ ...s, [e.key]: v === true }))}
                      className="mt-0.5"
                    />
                    <div className="min-w-0 flex-1">
                      <label htmlFor={`tg-${e.key}`} className="text-[13px] font-medium text-fg">
                        {e.label}
                      </label>
                      <p className="text-[12px] text-fg-3">{e.hint}</p>
                      {e.key === "sales" && events.sales ? (
                        <div className="mt-2 flex items-center gap-2">
                          <label htmlFor="tg-min" className="text-[12px] text-fg-3">
                            от
                          </label>
                          <div className="relative w-28">
                            <Input
                              id="tg-min"
                              inputMode="numeric"
                              value={minSale}
                              onChange={(ev) => setMinSale(ev.target.value.replace(/[^\d]/g, "").slice(0, 6))}
                              className="h-8 pr-7 font-mono text-[13px]"
                            />
                            <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 font-mono text-[12px] text-fg-4">₽</span>
                          </div>
                          <span className="text-[12px] text-fg-4">≈ 34 сообщения в день</span>
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
                {recipients.map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] text-fg">{r.name}</p>
                      <p className="truncate text-[12px] text-fg-3">{r.kind}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      aria-label={`Убрать ${r.name}`}
                      onClick={() => {
                        setRecipients((list) => list.filter((x) => x.id !== r.id));
                        toast(`${r.name} больше не получает уведомления`, {
                          action: { label: "Вернуть", onClick: () => setRecipients((list) => (list.some((x) => x.id === r.id) ? list : [...list, r])) },
                        });
                      }}
                    >
                      <Trash2 />
                    </Button>
                  </li>
                ))}
                {recipients.length === 0 ? <li className="px-3.5 py-3 text-[12.5px] text-fg-3">Никто не получает уведомления — добавьте хотя бы себя.</li> : null}
              </ul>
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
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setOpen(false);
                toast.success("Настройки бота сохранены", { description: `${enabledCount} событий · ${recipients.length} получателя` });
              }}
            >
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
    body: `${formatMoney(preview.digest.revenue)} · ${formatNumber(preview.digest.orders)} заказов · ${formatNumber(preview.digest.buyers)} покупателей. Сбоев выдачи: 0.`,
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
      body: `${formatMoney(preview.payout.amount)} отправлено по СБП · ${preview.payout.members} получателя · обычно 1–3 мин`,
      tone: "azure",
      on: events.payouts,
    });

  const visible = msgs.filter((m) => m.on);

  return (
    <div className="relative border-t border-line bg-canvas lg:border-t-0 lg:border-l">
      <div className="flex items-center gap-2.5 border-b border-line-soft px-4 py-3">
        <span className="flex size-8 items-center justify-center rounded-full bg-azure-600 font-mono text-[11px] font-semibold text-white">PM</span>
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-fg">ArcticMC Pay</p>
          <p className="text-[11.5px] text-fg-3">бот · {visible.length ? "в сети" : "молчит — все события выключены"}</p>
        </div>
        <span className="ml-auto label-mono text-fg-4">превью</span>
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
              <p className="mt-1 text-right font-mono text-[10.5px] text-fg-4 nums">{formatTime(m.at)}</p>
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
