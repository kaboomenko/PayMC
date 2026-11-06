"use client";

import * as React from "react";
import { Moon } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toaster";
import { SaveBar, SettingsSection, useSaveShortcut } from "./settings-ui";

const CHANNELS = [
  { key: "tg", label: "Telegram" },
  { key: "mail", label: "Почта" },
  { key: "app", label: "В кабинете" },
] as const;
type Channel = (typeof CHANNELS)[number]["key"];

const GROUPS: { label: string; events: { key: string; label: string; hint?: string; critical?: boolean }[] }[] = [
  {
    label: "Продажи",
    events: [
      { key: "sale", label: "Каждая продажа", hint: "≈ 85 в день" },
      { key: "big_sale", label: "Покупка от 1 000 ₽" },
      { key: "digest", label: "Сводка дня в 21:00" },
      { key: "weekly", label: "Отчёт за неделю, по понедельникам" },
    ],
  },
  {
    label: "Выдача",
    events: [
      { key: "delivery_failed", label: "Сбой выдачи", hint: "автоповторы закончились", critical: true },
      { key: "server_offline", label: "Сервер не на связи дольше 5 минут", critical: true },
      { key: "awaiting", label: "Игрок ждёт выдачу больше часа" },
    ],
  },
  {
    label: "Деньги",
    events: [
      { key: "payout_sent", label: "Выплата отправлена" },
      { key: "payout_failed", label: "Выплата не прошла основным банком", critical: true },
      { key: "chargeback", label: "Чарджбэк", critical: true },
      { key: "npd_limit", label: "Лимит самозанятого: 80 % и 95 %" },
    ],
  },
  {
    label: "Безопасность",
    events: [
      { key: "new_device", label: "Вход с нового устройства", critical: true },
      { key: "commands_changed", label: "Изменены команды выдачи" },
      { key: "member_joined", label: "Новый участник команды" },
    ],
  },
];

type Matrix = Record<string, Record<Channel, boolean>>;

const DEFAULTS: Matrix = (() => {
  const m: Matrix = {};
  const on = (tg: boolean, mail: boolean, app = true) => ({ tg, mail, app });
  m.sale = on(false, false);
  m.big_sale = on(true, false);
  m.digest = on(true, false);
  m.weekly = on(false, true);
  m.delivery_failed = on(true, true);
  m.server_offline = on(true, false);
  m.awaiting = on(false, false);
  m.payout_sent = on(true, false);
  m.payout_failed = on(true, true);
  m.chargeback = on(true, true);
  m.npd_limit = on(true, true);
  m.new_device = on(true, true);
  m.commands_changed = on(true, false);
  m.member_joined = on(false, true);
  return m;
})();

const ALL_EVENTS = GROUPS.flatMap((g) => g.events);

export function NotificationsMatrix() {
  const [saved, setSaved] = React.useState<Matrix>(DEFAULTS);
  const [m, setM] = React.useState<Matrix>(DEFAULTS);
  const [quiet, setQuiet] = React.useState(true);
  const [quietFrom, setQuietFrom] = React.useState("00");
  const dirty = JSON.stringify(m) !== JSON.stringify(saved);

  function colState(ch: Channel): boolean | "indeterminate" {
    const n = ALL_EVENTS.filter((e) => m[e.key][ch]).length;
    return n === 0 ? false : n === ALL_EVENTS.length ? true : "indeterminate";
  }

  function setCol(ch: Channel, v: boolean) {
    setM((prev) => Object.fromEntries(Object.entries(prev).map(([k, row]) => [k, { ...row, [ch]: v }])) as Matrix);
  }

  function save() {
    if (!dirty) return;
    const prev = saved;
    setSaved(m);
    toast.success("Уведомления сохранены", { action: { label: "Отменить", onClick: () => (setSaved(prev), setM(prev)) } });
  }
  useSaveShortcut(dirty, save);

  return (
    <div className="space-y-4">
      <SettingsSection title="Что и куда присылать" description="Настройки для вас — у каждого участника команды свои. Telegram подключён: @arcticmc_paybot.">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className="h-11 px-5 text-left font-mono text-[10.5px] font-medium tracking-[0.07em] text-fg-3 uppercase">
                  Событие
                </th>
                {CHANNELS.map((c) => {
                  const st = colState(c.key);
                  return (
                    <th key={c.key} scope="col" className="h-11 w-[120px] px-3 text-center">
                      <label className="inline-flex cursor-pointer flex-col items-center gap-1.5">
                        <span className="font-mono text-[10.5px] font-medium tracking-[0.07em] text-fg-3 uppercase">{c.label}</span>
                        <Checkbox checked={st} onCheckedChange={(v) => setCol(c.key, v === true)} aria-label={`${c.label}: все события`} />
                      </label>
                    </th>
                  );
                })}
              </tr>
            </thead>
            {GROUPS.map((g) => (
              <tbody key={g.label}>
                <tr>
                  <th colSpan={4} scope="colgroup" className="bg-surface-2/50 px-5 py-1.5 text-left label-mono text-fg-4">
                    {g.label}
                  </th>
                </tr>
                {g.events.map((e) => (
                  <tr key={e.key} className="border-b border-line-soft transition-colors hover:bg-white/[0.015]">
                    <th scope="row" className="px-5 py-2.5 text-left font-normal">
                      <span className="text-fg-2">{e.label}</span>
                      {e.critical ? <span className="ml-2 font-mono text-[10.5px] text-warn">важное</span> : null}
                      {e.hint ? <span className="block text-[11.5px] text-fg-4">{e.hint}</span> : null}
                    </th>
                    {CHANNELS.map((c) => (
                      <td key={c.key} className="px-3 py-2.5 text-center">
                        <Checkbox
                          checked={m[e.key][c.key]}
                          onCheckedChange={(v) => setM((prev) => ({ ...prev, [e.key]: { ...prev[e.key], [c.key]: v === true } }))}
                          aria-label={`${e.label} — ${c.label}`}
                          className="mx-auto"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>
      </SettingsSection>

      <section className="flex flex-col gap-4 rounded-xl border border-line bg-surface px-5 py-4 shadow-raise sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Moon className="mt-0.5 size-4 shrink-0 text-fg-3" />
          <div>
            <p className="text-[13px] font-medium text-fg">Тихие часы</p>
            <p className="mt-0.5 max-w-xl text-[12.5px] text-fg-3">
              Ночью приходят только события с пометкой «важное»: сбой выдачи, сервер упал, выплата не прошла, чарджбэк, вход с нового устройства.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={quietFrom} onValueChange={setQuietFrom} disabled={!quiet}>
            <SelectTrigger size="sm" className="w-[150px] font-mono" aria-label="Начало тихих часов">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="23">23:00–08:00</SelectItem>
              <SelectItem value="00">00:00–08:00</SelectItem>
              <SelectItem value="01">01:00–09:00</SelectItem>
            </SelectContent>
          </Select>
          <Switch checked={quiet} onCheckedChange={setQuiet} aria-label="Тихие часы" />
        </div>
      </section>

      <SaveBar open={dirty} message="Изменены каналы уведомлений" onReset={() => setM(saved)} onSave={save} />
    </div>
  );
}
