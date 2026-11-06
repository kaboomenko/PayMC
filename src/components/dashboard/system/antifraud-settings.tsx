"use client";

import * as React from "react";
import { ArrowRight, Plus, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMoney, formatRelative } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

function toggleToast(title: string, on: boolean, undo: () => void) {
  toast(`${title}: ${on ? "включено" : "выключено"}`, { action: { label: "Отменить", onClick: undo } });
}

export function AntifraudSettings({ blocked, now }: { blocked: BlockedPayment[]; now: number }) {
  const [s, setS] = React.useState({ threeDs: false, network: true, parental: true, vpn: false });
  const [limit, setLimit] = React.useState("3000");
  const [rules, setRules] = React.useState(RULES);

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
            description="Сверх лимита оплата не пройдёт до полуночи по МСК. Защищает от трат с чужой карты и импульсивных покупок."
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
            <Button variant="secondary" size="xs" onClick={() => toast("Конструктор правил", { description: "Условие → действие, например «≥ 2 игроков с одной карты → отклонять»" })}>
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
                  <span className="font-mono text-[11.5px] text-fg-3">сработало {r.hits} раз</span>
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
    </div>
  );
}
