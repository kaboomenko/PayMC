"use client";

import * as React from "react";
import { ArrowRight, Plus, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMoney, formatRelative, pluralize } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toaster";
import { SettingRow, SettingsSection, StatStrip } from "./settings-ui";
import type { BlockedPayment } from "./settings-types";

interface Rule {
  id: string;
  when: string;
  then: string;
  tone: "bad" | "warn" | "azure";
  hits: number;
  on: boolean;
}

const RULES: Rule[] = [
  { id: "r1", when: "≥ 4 карт за 7 дней у одного игрока", then: "Отклонять", tone: "bad", hits: 6, on: true },
  { id: "r2", when: "≥ 3 неудачных оплаты за 10 минут", then: "Пауза 30 мин", tone: "warn", hits: 5, on: true },
  { id: "r3", when: "Новый игрок (< 3 дней) тратит ≥ 15 000 ₽ за сутки", then: "Ручная проверка", tone: "warn", hits: 1, on: true },
  { id: "r4", when: "Страна карты ≠ страна IP", then: "Запросить 3-D Secure", tone: "azure", hits: 9, on: false },
];

const CONDITIONS = [
  "≥ 2 игроков с одной карты за сутки",
  "≥ 3 оплаты с одного IP за час",
  `Покупка ≥ ${formatMoney(5000)} у игрока младше 7 дней`,
  "≥ 5 неверных промокодов за 10 минут",
  "Карта выпущена не в стране игрока",
];
const ACTIONS: { label: string; tone: Rule["tone"] }[] = [
  { label: "Отклонять", tone: "bad" },
  { label: "Ручная проверка", tone: "warn" },
  { label: "Пауза 30 мин", tone: "warn" },
  { label: "Запросить 3-D Secure", tone: "azure" },
];

function toggleToast(title: string, on: boolean, undo: () => void) {
  toast(`${title}: ${on ? "включено" : "выключено"}`, { action: { label: "Отменить", onClick: undo } });
}

export function AntifraudSettings({ blocked, now }: { blocked: BlockedPayment[]; now: number }) {
  const [s, setS] = React.useState({ threeDs: false, network: true, parental: true, vpn: false });
  // no cap by default: a daily cap would block the big purchases the velocity rules below are built to review
  const [limit, setLimit] = React.useState("0");
  const [rules, setRules] = React.useState(RULES);
  const [ruleOpen, setRuleOpen] = React.useState(false);

  function flip(key: keyof typeof s, title: string) {
    return (v: boolean) => {
      setS((p) => ({ ...p, [key]: v }));
      toggleToast(title, v, () => setS((p) => ({ ...p, [key]: !v })));
    };
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 space-y-4">
        <StatStrip
          items={[
            { label: "Отклонено за 30 дней", value: "14 платежей", hint: `на ${formatMoney(18_640)}` },
            { label: "Ложных срабатываний", value: "0", hint: "ни один честный игрок не жаловался", tone: "ok" },
            { label: "Доля чарджбэков", value: "0,04 %", hint: "порог платёжных систем — 0,9 %", tone: "ok" },
          ]}
        />

        <SettingsSection title="Проверки при оплате" description="Включайте строгие проверки, только если растут чарджбэки — каждая лишняя проверка снижает конверсию.">
          <SettingRow
            title="3-D Secure для всех карт"
            description="Сейчас код из SMS запрашивается только при риске выше 60. Если включить для всех — минус 6–8 % оплат картой, зато чарджбэки почти исчезнут."
            control={<Switch checked={s.threeDs} onCheckedChange={flip("threeDs", "3-D Secure для всех карт")} aria-label="3-D Secure для всех карт" />}
          />
          <SettingRow
            title="Общий чёрный список PayMC"
            description={
              <>
                Карты и игроки, которые оспаривали платежи в любом проекте PayMC. <span className="font-mono text-fg-2">2 314</span> записей, обновляется в реальном
                времени. Ваши чарджбэки тоже попадают туда — анонимно.
              </>
            }
            control={<Switch checked={s.network} onCheckedChange={flip("network", "Общий чёрный список")} aria-label="Общий чёрный список PayMC" />}
          />
          <SettingRow
            title="Лимит покупок в сутки на игрока"
            htmlFor="af-limit"
            description="Сверх лимита оплата не пройдёт до полуночи по МСК. Для серверов с детской аудиторией советуем 3 000 ₽ — защищает от трат с чужой карты и импульсивных покупок."
            control={
              <div className="w-full sm:w-44">
                <Select
                  value={limit}
                  onValueChange={(v) => {
                    setLimit(v);
                    toast.success(v === "0" ? "Лимит снят" : `Лимит: ${formatMoney(Number(v))} в сутки`);
                  }}
                >
                  <SelectTrigger id="af-limit" size="sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Без лимита</SelectItem>
                    {[1500, 3000, 5000, 10000].map((v) => (
                      <SelectItem key={v} value={String(v)}>
                        {formatMoney(v)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            }
          />
          <SettingRow
            title="Родительский контроль"
            description="Подтверждение покупок дороже 1 000 ₽ для игроков младше 14 лет: родитель получает ссылку по SMS и одобряет оплату. Возраст игрок указывает при первой покупке."
            control={<Switch checked={s.parental} onCheckedChange={flip("parental", "Родительский контроль")} aria-label="Родительский контроль" />}
          />
          <SettingRow
            title="Блокировать VPN и прокси при оплате картой"
            description="СБП не затрагивается — там банк сам подтверждает личность. Включайте, если видите волну оплат через анонимайзеры."
            control={<Switch checked={s.vpn} onCheckedChange={flip("vpn", "Блокировка VPN")} aria-label="Блокировать VPN и прокси при оплате картой" />}
          />
        </SettingsSection>

        <SettingsSection
          title="Правила скорости"
          description="Срабатывают до списания денег. Счётчик — за последние 30 дней."
          aside={
            <Button variant="secondary" size="xs" onClick={() => setRuleOpen(true)}>
              <Plus />
              Правило
            </Button>
          }
        >
          <ul>
            {rules.map((r) => (
              <li key={r.id} className={cn("flex flex-col gap-2 border-b border-line-soft px-5 py-3 last:border-0 sm:flex-row sm:items-center sm:gap-4", !r.on && "opacity-60")}>
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2.5 gap-y-1.5">
                  <span className="font-mono text-[12.5px] text-fg">{r.when}</span>
                  <ArrowRight className="size-3.5 shrink-0 text-fg-4" />
                  <Badge tone={r.tone}>{r.then}</Badge>
                </div>
                <div className="flex shrink-0 items-center justify-between gap-4 sm:justify-end">
                  <span className="font-mono text-[11.5px] text-fg-3">
                    {r.hits ? `сработало ${pluralize(r.hits, ["раз", "раза", "раз"])}` : "ещё не срабатывало"}
                  </span>
                  <Switch
                    size="sm"
                    checked={r.on}
                    onCheckedChange={(v) => setRules((list) => list.map((x) => (x.id === r.id ? { ...x, on: v } : x)))}
                    aria-label={`Правило: ${r.when}`}
                  />
                </div>
              </li>
            ))}
          </ul>
        </SettingsSection>
      </div>

      <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
        <section className="rounded-xl border border-line bg-surface shadow-raise">
          <header className="flex items-center justify-between border-b border-line-soft px-5 py-3.5">
            <h2 className="text-sm font-semibold text-fg">Последние отклонённые</h2>
            <ShieldCheck className="size-4 text-ice-300" />
          </header>
          <ul>
            {blocked.map((b) => (
              <li key={b.id} className="border-b border-line-soft px-5 py-3 last:border-0">
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate font-mono text-[12.5px] text-fg">{b.player}</span>
                  <span className="font-mono text-[12.5px] text-fg-2 nums">{formatMoney(b.amount)}</span>
                </div>
                <p className="mt-0.5 text-[12px] text-fg-3">{b.reason}</p>
                <p className="mt-0.5 font-mono text-[11px] text-fg-4">{formatRelative(b.at, now)} · деньги не списаны</p>
              </li>
            ))}
          </ul>
        </section>
        <p className="px-1 text-[12px] leading-relaxed text-fg-4">
          При чарджбэке PayMC сам снимает выданное командой, добавляет игрока в чёрный список и прикладывает трассировку выдачи к ответу банку.
        </p>
      </aside>

      <RuleDialog
        open={ruleOpen}
        onOpenChange={setRuleOpen}
        existing={rules}
        onAdd={(rule) => {
          setRules((list) => [...list, rule]);
          toast.success("Правило добавлено", {
            description: `${rule.when} → ${rule.then.toLowerCase()} · действует со следующей оплаты`,
            action: { label: "Отменить", onClick: () => setRules((list) => list.filter((x) => x.id !== rule.id)) },
          });
        }}
      />
    </div>
  );
}

function RuleDialog({
  open,
  onOpenChange,
  existing,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  existing: Rule[];
  onAdd: (rule: Rule) => void;
}) {
  const [when, setWhen] = React.useState(CONDITIONS[0]);
  const [then, setThen] = React.useState(ACTIONS[0].label);
  const [wasOpen, setWasOpen] = React.useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (open) {
      setWhen(CONDITIONS[0]);
      setThen(ACTIONS[0].label);
    }
  }
  const duplicate = existing.some((r) => r.when === when && r.then === then);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (duplicate) return;
    const action = ACTIONS.find((a) => a.label === then) ?? ACTIONS[0];
    onAdd({ id: `r${existing.length + 1}-${CONDITIONS.indexOf(when)}`, when, then: action.label, tone: action.tone, hits: 0, on: true });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[520px]">
        <form onSubmit={submit} noValidate>
          <DialogHeader>
            <DialogTitle>Новое правило</DialogTitle>
            <DialogDescription>Условие → действие. Проверяется до списания денег, счётчик срабатываний начнётся с нуля.</DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <Field label="Если" htmlFor="rule-when">
              <Select value={when} onValueChange={setWhen}>
                <SelectTrigger id="rule-when">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONDITIONS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="То" htmlFor="rule-then" error={duplicate ? "Такое правило уже есть" : null}>
              <Select value={then} onValueChange={setThen}>
                <SelectTrigger id="rule-then">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTIONS.map((a) => (
                    <SelectItem key={a.label} value={a.label}>
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 rounded-lg border border-line-soft bg-surface-2/60 px-3 py-2.5">
              <span className="font-mono text-[12.5px] text-fg">{when}</span>
              <ArrowRight className="size-3.5 shrink-0 text-fg-4" />
              <Badge tone={ACTIONS.find((a) => a.label === then)?.tone ?? "bad"}>{then}</Badge>
            </div>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={duplicate}>
              <Plus />
              Добавить правило
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
