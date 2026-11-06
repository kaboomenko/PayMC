"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Eye, EyeOff, Loader2, Plus, RotateCw, Send, Webhook } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDuration, formatPercent } from "@/lib/format";
import { NOW_MS } from "@/lib/mock/now";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CodeBlock } from "@/components/ui/code-block";
import { CopyButton } from "@/components/ui/copy-button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toaster";

const EVENT_TYPES = [
  { key: "order.paid", hint: "платёж подтверждён" },
  { key: "order.delivered", hint: "сервер подтвердил выдачу" },
  { key: "order.failed", hint: "автоповторы закончились" },
  { key: "order.awaiting_player", hint: "ждём входа игрока" },
  { key: "order.refunded", hint: "возврат, выданное снято" },
  { key: "chargeback.created", hint: "банк оспорил платёж" },
  { key: "payout.sent", hint: "выплата отправлена" },
  { key: "payout.failed", hint: "банк не принял перевод" },
  { key: "player.first_purchase", hint: "первая покупка игрока" },
  { key: "server.offline", hint: "агент без связи > 2 мин" },
  { key: "server.online", hint: "агент снова на связи" },
  { key: "receipt.registered", hint: "чек в «Мой налог»" },
] as const;

interface Endpoint {
  id: string;
  url: string;
  events: string[];
  /** share of delivered events over 30 days; null until the first real event */
  success: number | null;
  last: { code: number; ms: number; ago: string };
  enabled: boolean;
  /** 30 daily delivery rates for the strip */
  history: number[];
}

const ENDPOINTS: Endpoint[] = [
  {
    id: "we_1",
    url: "https://api.arcticmc.ru/paymc/webhook",
    events: ["order.paid", "order.delivered", "order.failed", "chargeback.created", "payout.sent"],
    success: 99.98,
    last: { code: 200, ms: 84, ago: "2 мин назад" },
    enabled: true,
    history: Array.from({ length: 30 }, (_, i) => (i === 11 ? 99.2 : 100)),
  },
  {
    id: "we_2",
    url: "https://n8n.arcticmc.ru/webhook/sales-sheet",
    events: ["order.paid"],
    success: 100,
    last: { code: 200, ms: 212, ago: "6 мин назад" },
    enabled: true,
    history: Array.from({ length: 30 }, () => 100),
  },
];

const SECRET = "whsec_7Hq2mZpX4vLr9sTe3fKa8bNc";

export function WebhooksPanel({ payload }: { payload: { json: string; orderId: string; deliveryMs: number } }) {
  const reduce = useReducedMotion();
  const [endpoints, setEndpoints] = React.useState(ENDPOINTS);
  const [selected, setSelected] = React.useState(ENDPOINTS[0].id);
  const [reveal, setReveal] = React.useState(false);
  const [secret, setSecret] = React.useState(SECRET);
  const [test, setTest] = React.useState<"idle" | "sending" | "done">("idle");
  const [addOpen, setAddOpen] = React.useState(false);
  const ep = endpoints.find((e) => e.id === selected) ?? endpoints[0];

  function addEndpoint(url: string, events: string[]) {
    const id = `we_${endpoints.length + 1}`;
    setEndpoints((list) => [...list, { id, url, events, success: null, last: { code: 200, ms: 143, ago: "только что" }, enabled: true, history: [] }]);
    setSelected(id);
    setTest("idle");
    toast.success("Эндпоинт добавлен", { description: `${url.replace("https://", "")} ответил 200 на проверочный запрос` });
  }
  const masked = `${secret.slice(0, 6)}${"•".repeat(16)}${secret.slice(-4)}`;
  const ts = Math.floor(NOW_MS / 1000);

  function toggleEvent(key: string, on: boolean) {
    setEndpoints((list) => list.map((e) => (e.id === ep.id ? { ...e, events: on ? [...e.events, key] : e.events.filter((k) => k !== key) } : e)));
  }

  function sendTest() {
    setTest("sending");
    setTimeout(() => {
      setTest("done");
      toast.success("Тестовое событие доставлено", { description: `${ep.url.replace("https://", "")} ответил 200 за 91 мс` });
    }, 700);
  }

  return (
    <section id="webhooks" aria-labelledby="wh-title" className="scroll-mt-20">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="wh-title" className="text-[15px] font-medium text-fg">
            Вебхуки
          </h2>
          <p className="mt-0.5 text-[13px] text-fg-3">
            Подписанные HMAC-SHA256 события. Не ответили 2xx за 10 с — повторим 8 раз в течение суток.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => setAddOpen(true)}>
          <Plus />
          Добавить эндпоинт
        </Button>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-12">
        <div className="min-w-0 rounded-xl border border-line bg-surface shadow-raise lg:col-span-5">
          <ul role="listbox" aria-label="Эндпоинты">
            {endpoints.map((e) => (
              <li key={e.id} className="border-b border-line-soft last:border-0">
                <div
                  role="option"
                  aria-selected={e.id === ep.id}
                  tabIndex={0}
                  onClick={() => setSelected(e.id)}
                  onKeyDown={(k) => (k.key === "Enter" || k.key === " ") && (k.preventDefault(), setSelected(e.id))}
                  className={cn(
                    "relative cursor-pointer px-5 py-3.5 transition-colors outline-none hover:bg-white/[0.02] focus-visible:bg-white/[0.03]",
                    e.id === ep.id && "bg-azure-500/[0.05]",
                  )}
                >
                  {e.id === ep.id ? <span aria-hidden className="absolute inset-y-0 left-0 w-0.5 bg-azure-500" /> : null}
                  <div className="flex items-start justify-between gap-3">
                    <p className="min-w-0 truncate font-mono text-[12.5px] text-fg">{e.url.replace("https://", "")}</p>
                    <Switch
                      size="sm"
                      checked={e.enabled}
                      onClick={(ev) => ev.stopPropagation()}
                      onCheckedChange={(v) => {
                        setEndpoints((list) => list.map((x) => (x.id === e.id ? { ...x, enabled: v } : x)));
                        toast(v ? "Эндпоинт включён" : "Эндпоинт на паузе", { description: v ? "События снова отправляются" : "События копятся 72 часа и уйдут после включения" });
                      }}
                      aria-label={`Включить ${e.url}`}
                    />
                  </div>
                  {e.history.length ? (
                    <div className="mt-2 flex h-4 items-end gap-px" aria-hidden>
                      {e.history.map((v, i) => (
                        <span key={i} className={cn("flex-1 rounded-[1px]", v < 100 ? "h-2.5 bg-warn/80" : "h-4 bg-ok/50")} />
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 flex h-4 items-center text-[11.5px] text-fg-4">история доставки появится с первыми событиями</p>
                  )}
                  <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11.5px] text-fg-3">
                    {e.success !== null ? <span className="text-ok">{formatPercent(e.success, { digits: 2 })} доставлено</span> : <span>проверка пройдена</span>}
                    <span>
                      {e.last.code} · {e.last.ms} мс · {e.last.ago}
                    </span>
                    <span>{e.events.length} соб.</span>
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <div className="border-t border-line px-5 py-4">
            <p className="label-mono text-fg-3">Секрет подписи</p>
            <div className="mt-2 flex items-center gap-1 rounded-md border border-line bg-surface-2 py-1 pr-1 pl-3">
              <code className="min-w-0 flex-1 truncate font-mono text-[12.5px] text-fg-2" aria-live="polite">
                {reveal ? secret : masked}
              </code>
              <Button variant="ghost" size="icon-xs" aria-label={reveal ? "Скрыть секрет" : "Показать секрет"} onClick={() => setReveal((v) => !v)}>
                {reveal ? <EyeOff /> : <Eye />}
              </Button>
              <CopyButton value={secret} label="Скопировать секрет" />
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <p className="text-[11.5px] text-fg-4">Заголовок X-PayMC-Signature: t=…,v1=…</p>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => {
                  const prev = secret;
                  setSecret("whsec_Rk5nW2cQ8yJd6tVb1mPx4LsA");
                  setReveal(true);
                  toast("Секрет перевыпущен", {
                    description: "Старый работает ещё 24 часа — успейте обновить сервер",
                    action: { label: "Отменить", onClick: () => setSecret(prev) },
                  });
                }}
              >
                <RotateCw />
                Перевыпустить
              </Button>
            </div>
          </div>
        </div>

        <div className="min-w-0 rounded-xl border border-line bg-surface shadow-raise lg:col-span-7">
          <div className="border-b border-line-soft px-5 py-3.5">
            <p className="label-mono text-fg-3">События эндпоинта</p>
            <p className="mt-1 truncate font-mono text-[12.5px] text-fg-2">{ep.url}</p>
          </div>
          <fieldset className="grid gap-x-4 gap-y-2.5 px-5 py-4 sm:grid-cols-2">
            <legend className="sr-only">События</legend>
            {EVENT_TYPES.map((t) => {
              const id = `ev-${ep.id}-${t.key}`;
              const on = ep.events.includes(t.key);
              return (
                <label key={t.key} htmlFor={id} className="flex cursor-pointer items-start gap-2.5">
                  <Checkbox id={id} checked={on} onCheckedChange={(v) => toggleEvent(t.key, v === true)} className="mt-0.5" />
                  <span className="min-w-0">
                    <span className={cn("block font-mono text-[12.5px]", on ? "text-fg" : "text-fg-3")}>{t.key}</span>
                    <span className="block text-[11.5px] text-fg-4">{t.hint}</span>
                  </span>
                </label>
              );
            })}
          </fieldset>
          <div className="flex flex-col gap-3 border-t border-line-soft px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-[12.5px] text-fg-3">
              Пример — реальный заказ <span className="font-mono text-fg-2">{payload.orderId}</span>, выдан за {formatDuration(payload.deliveryMs)}.
            </p>
            <Button variant="primary" size="sm" onClick={sendTest} disabled={test === "sending" || !ep.enabled}>
              {test === "sending" ? <Loader2 className="animate-spin" /> : <Send />}
              Отправить тестовое событие
            </Button>
          </div>
          <AnimatePresence initial={false}>
            {test === "done" ? (
              <motion.div
                initial={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
                animate={reduce ? { opacity: 1 } : { opacity: 1, height: "auto" }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                <div className="space-y-3 border-t border-line-soft px-5 py-4">
                  <div className="flex flex-wrap items-center gap-2 text-[12.5px]">
                    <Badge tone="ok">200 OK</Badge>
                    <span className="font-mono text-fg-3">91 мс · попытка 1 из 9</span>
                    <span className="font-mono text-fg-4">evt · order.delivered</span>
                  </div>
                  <CodeBlock
                    title="Заголовки"
                    code={`POST ${ep.url}\nContent-Type: application/json\nX-PayMC-Event: order.delivered\nX-PayMC-Signature: t=${ts},v1=5d1f9c0e4b7a2f63c8e1d0b9a4f7e2c6d3b8a1f0e9c7d4b2a6f8e1c3d5b7a9f0`}
                  />
                  <CodeBlock title="Тело · JSON" code={payload.json} className="[&_pre]:max-h-[360px]" />
                </div>
              </motion.div>
            ) : test === "idle" ? (
              <div className="flex items-center gap-2 border-t border-line-soft px-5 py-3 text-[12.5px] text-fg-4">
                <Webhook className="size-3.5" />
                Тело запроса появится здесь после отправки
              </div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      <AddEndpointDialog open={addOpen} onOpenChange={setAddOpen} existing={endpoints.map((e) => e.url)} onAdd={addEndpoint} />
    </section>
  );
}

const DEFAULT_EVENTS = ["order.paid", "order.delivered", "order.failed"];

function AddEndpointDialog({
  open,
  onOpenChange,
  existing,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  existing: string[];
  onAdd: (url: string, events: string[]) => void;
}) {
  const [url, setUrl] = React.useState("https://");
  const [events, setEvents] = React.useState<string[]>(DEFAULT_EVENTS);
  const [tried, setTried] = React.useState(false);
  const [wasOpen, setWasOpen] = React.useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (open) {
      setUrl("https://");
      setEvents(DEFAULT_EVENTS);
      setTried(false);
    }
  }

  const value = url.trim();
  const urlError = (() => {
    if (!value.startsWith("https://")) return "Только HTTPS — подпись не спасёт от перехвата по HTTP";
    try {
      const u = new URL(value);
      if (!u.hostname.includes(".")) return "Похоже, в адресе нет домена";
    } catch {
      return "Похоже, в адресе опечатка";
    }
    if (existing.includes(value)) return "Этот адрес уже получает события";
    return null;
  })();
  const eventsError = events.length === 0 ? "Выберите хотя бы одно событие" : null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setTried(true);
    if (urlError || eventsError) return;
    onAdd(value, events);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[560px]">
        <form onSubmit={submit} noValidate>
          <DialogHeader>
            <DialogTitle>Новый эндпоинт</DialogTitle>
            <DialogDescription>Пришлём на адрес проверочный запрос — эндпоинт должен ответить 2xx за 10 с.</DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <Field label="Адрес" htmlFor="wh-url" error={tried ? urlError : null} hint="Например: https://api.arcticmc.ru/paymc/webhook">
              <Input
                id="wh-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                aria-invalid={tried && !!urlError}
                spellCheck={false}
                autoComplete="off"
                autoFocus
                className="font-mono text-[13px]"
              />
            </Field>
            <fieldset>
              <legend className="mb-1.5 text-[13px] font-medium text-fg-2">События</legend>
              <div className="grid max-h-[260px] gap-x-4 gap-y-2.5 overflow-y-auto rounded-lg border border-line px-3.5 py-3 sm:grid-cols-2">
                {EVENT_TYPES.map((t) => {
                  const id = `new-ev-${t.key}`;
                  const on = events.includes(t.key);
                  return (
                    <label key={t.key} htmlFor={id} className="flex cursor-pointer items-start gap-2.5">
                      <Checkbox
                        id={id}
                        checked={on}
                        onCheckedChange={(v) => setEvents((list) => (v === true ? [...list, t.key] : list.filter((k) => k !== t.key)))}
                        className="mt-0.5"
                      />
                      <span className="min-w-0">
                        <span className={cn("block font-mono text-[12.5px]", on ? "text-fg" : "text-fg-3")}>{t.key}</span>
                        <span className="block text-[11.5px] text-fg-4">{t.hint}</span>
                      </span>
                    </label>
                  );
                })}
              </div>
              {tried && eventsError ? <p className="mt-1.5 text-xs text-bad">{eventsError}</p> : null}
            </fieldset>
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
