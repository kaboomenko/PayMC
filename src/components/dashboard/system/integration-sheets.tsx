"use client";

import * as React from "react";
import { Check, ExternalLink, Save } from "lucide-react";
import { formatNumber } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toaster";
import { Note } from "./settings-ui";

/* ───────────── VK ───────────── */

interface VkSettings {
  chat: string;
  minSale: string;
  winback: boolean;
}

const VK_CHATS = [
  { value: "donate", label: "Беседа «Донат-лента» · 2 140 участников" },
  { value: "staff", label: "Беседа «Команда ArcticMC» · 6 участников" },
  { value: "off", label: "Не отправлять продажи" },
];

/** The form edits a draft: it is copied from the saved state on open and only committed by «Сохранить». */
export function VkSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [saved, setSaved] = React.useState<VkSettings>({ chat: "donate", minSale: "500", winback: true });
  const [draft, setDraft] = React.useState(saved);
  const [wasOpen, setWasOpen] = React.useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (open) setDraft(saved);
  }
  const set = <K extends keyof VkSettings>(k: K, v: VkSettings[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const min = Number(draft.minSale) || 0;

  function save() {
    setSaved(draft);
    onOpenChange(false);
    const chat = VK_CHATS.find((c) => c.value === draft.chat);
    toast.success("Настройки VK сохранены", {
      description: draft.chat === "off" ? "Продажи в беседу не отправляются" : `${chat?.label.split(" · ")[0]} · покупки от ${formatNumber(min)} ₽`,
    });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>VK · сообщество ArcticMC</SheetTitle>
          <SheetDescription>Покупки в беседу и рассылки сообщества для кампаний возврата.</SheetDescription>
        </SheetHeader>
        <SheetBody className="space-y-5">
          <div className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface-2/60 px-3.5 py-3">
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-fg">vk.com/arcticmc</p>
              <p className="text-[12px] text-fg-3">41 тыс участников · доступ к сообщениям сообщества выдан</p>
            </div>
            <Button asChild variant="ghost" size="xs" className="shrink-0">
              <a href="https://vk.com" target="_blank" rel="noreferrer">
                Открыть
                <ExternalLink />
              </a>
            </Button>
          </div>

          <Field label="Беседа для продаж" htmlFor="vk-chat" hint="Бот сообщества пишет туда ник, товар и сервер — без суммы, если беседа открытая.">
            <Select value={draft.chat} onValueChange={(v) => set("chat", v)}>
              <SelectTrigger id="vk-chat">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VK_CHATS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {draft.chat !== "off" ? (
            <Field label="Покупки от" htmlFor="vk-min" hint="Мелкие покупки не засоряют беседу.">
              <div className="relative w-32">
                <Input
                  id="vk-min"
                  inputMode="numeric"
                  value={draft.minSale}
                  onChange={(e) => set("minSale", e.target.value.replace(/[^\d]/g, "").slice(0, 6))}
                  className="pr-7 font-mono"
                />
                <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 font-mono text-[12px] text-fg-4">₽</span>
              </div>
            </Field>
          ) : null}

          <label className="flex items-start justify-between gap-4">
            <span>
              <span className="block text-[13px] font-medium text-fg">Рассылки для кампаний возврата</span>
              <span className="block text-[12px] leading-relaxed text-fg-3">
                Игрокам, которые давно не заходили, — сообщение от сообщества с промокодом. Только тем, кто разрешил сообщения.
              </span>
            </span>
            <Switch checked={draft.winback} onCheckedChange={(v) => set("winback", v)} aria-label="Рассылки для кампаний возврата" />
          </label>

          <Note>VK ограничивает рассылки сообществ: не больше одного сообщения игроку в сутки. PayMC сам соблюдает лимит.</Note>
        </SheetBody>
        <SheetFooter className="justify-end">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Закрыть
          </Button>
          <Button variant="primary" size="sm" onClick={save}>
            <Save />
            Сохранить
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/* ───────────── Яндекс Метрика ───────────── */

const GOALS = [
  { key: "checkout", label: "Начал оплату", hint: "открыл окно оплаты на витрине" },
  { key: "purchase", label: "Оплатил", hint: "с суммой заказа — для расчёта окупаемости рекламы" },
  { key: "view", label: "Открыл товар", hint: "просмотр карточки товара" },
] as const;
type GoalKey = (typeof GOALS)[number]["key"];

interface MetrikaSettings {
  counter: string;
  goals: Record<GoalKey, boolean>;
  ecommerce: boolean;
}

export function MetrikaSheet({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** new detail line for the integration card, e.g. «Счётчик 98•••41» */
  onSaved?: (detail: string) => void;
}) {
  const [saved, setSaved] = React.useState<MetrikaSettings>({ counter: "98270541", goals: { checkout: true, purchase: true, view: false }, ecommerce: true });
  const [draft, setDraft] = React.useState(saved);
  const [tried, setTried] = React.useState(false);
  const [wasOpen, setWasOpen] = React.useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (open) {
      setDraft(saved);
      setTried(false);
    }
  }
  const counterError = /^\d{6,9}$/.test(draft.counter) ? null : "Номер счётчика — от 6 до 9 цифр, без пробелов";
  const goalCount = Object.values(draft.goals).filter(Boolean).length;

  function save() {
    setTried(true);
    if (counterError) return;
    setSaved(draft);
    onOpenChange(false);
    const masked = `${draft.counter.slice(0, 2)}•••${draft.counter.slice(-2)}`;
    onSaved?.(`Счётчик ${masked}`);
    toast.success("Метрика настроена", { description: `Счётчик ${masked} · целей: ${goalCount} · данные появятся через 5–10 минут` });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Яндекс Метрика</SheetTitle>
          <SheetDescription>Цели витрины и суммы заказов — для рекламы и аналитики.</SheetDescription>
        </SheetHeader>
        <SheetBody className="space-y-5">
          <Field label="Номер счётчика" htmlFor="ym-counter" error={tried ? counterError : null} hint="Метрика → Настройки → номер над кодом счётчика.">
            <Input
              id="ym-counter"
              inputMode="numeric"
              value={draft.counter}
              onChange={(e) => setDraft((d) => ({ ...d, counter: e.target.value.replace(/[^\d]/g, "").slice(0, 9) }))}
              aria-invalid={tried && !!counterError}
              className="font-mono"
            />
          </Field>

          <fieldset>
            <legend className="label-mono text-fg-3">Цели</legend>
            <ul className="mt-2 divide-y divide-line-soft rounded-lg border border-line">
              {GOALS.map((g) => (
                <li key={g.key} className="flex items-start gap-3 px-3.5 py-3">
                  <Checkbox
                    id={`ym-${g.key}`}
                    checked={draft.goals[g.key]}
                    onCheckedChange={(v) => setDraft((d) => ({ ...d, goals: { ...d.goals, [g.key]: v === true } }))}
                    className="mt-0.5"
                  />
                  <div className="min-w-0">
                    <label htmlFor={`ym-${g.key}`} className="text-[13px] font-medium text-fg">
                      «{g.label}»
                    </label>
                    <p className="text-[12px] text-fg-3">{g.hint}</p>
                  </div>
                </li>
              ))}
            </ul>
          </fieldset>

          <label className="flex items-start justify-between gap-4">
            <span>
              <span className="block text-[13px] font-medium text-fg">Электронная коммерция</span>
              <span className="block text-[12px] leading-relaxed text-fg-3">Товары, цены и выручка — в отчёте Метрики «Электронная коммерция».</span>
            </span>
            <Switch checked={draft.ecommerce} onCheckedChange={(v) => setDraft((d) => ({ ...d, ecommerce: v }))} aria-label="Электронная коммерция" />
          </label>

          <Note icon={<Check />}>Код счётчика на витрину ставить не нужно — PayMC добавит его сам.</Note>
        </SheetBody>
        <SheetFooter className="justify-end">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Закрыть
          </Button>
          <Button variant="primary" size="sm" onClick={save}>
            <Save />
            Сохранить
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
