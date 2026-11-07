"use client";

import * as React from "react";
import { KeyRound, LogOut, Monitor, ShieldCheck, Smartphone, Tablet } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateTime, formatRelative } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableWrap, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { toast } from "@/components/ui/toaster";
import { CopyButton } from "@/components/ui/copy-button";
import { Note, SettingRow, SettingsSection } from "./settings-ui";
import type { TeamRow } from "./settings-types";

interface Session {
  id: string;
  device: "desktop" | "phone" | "tablet";
  name: string;
  place: string;
  ip: string;
  lastAt: number;
  current?: boolean;
}

const BACKUP_CODES = ["4F7K-92QD", "M2XR-61TA", "Z8PW-03LC", "B5NJ-77HE", "Q1VS-48RM", "H6TD-15YB", "C9LG-30WK", "R3EA-86PF"];

export function SecuritySettings({ team, now }: { team: TeamRow[]; now: number }) {
  const min = 60_000;
  const [sessions, setSessions] = React.useState<Session[]>([
    { id: "s1", device: "desktop", name: "Chrome 131 · macOS", place: "Москва", ip: "95.165.•.•", lastAt: now, current: true },
    { id: "s2", device: "phone", name: "Приложение Telegram · iOS", place: "Москва", ip: "95.165.•.•", lastAt: now - 41 * min },
    { id: "s3", device: "tablet", name: "Safari · iPadOS", place: "Москва", ip: "176.59.•.•", lastAt: now - 2 * 24 * 60 * min },
    { id: "s4", device: "desktop", name: "Firefox 132 · Windows", place: "Тверь", ip: "188.170.•.•", lastAt: now - 6 * 24 * 60 * min },
  ]);
  const [codesOpen, setCodesOpen] = React.useState(false);
  const no2fa = team.filter((m) => !m.twoFactor);

  const history = [
    { at: now - 3 * min, event: "Вход", device: "Chrome 131 · macOS", place: "Москва · 95.165.•.•", ok: true },
    { at: now - 41 * min, event: "Вход через Telegram", device: "iOS", place: "Москва · 95.165.•.•", ok: true },
    { at: now - 19 * 60 * min, event: "Неверный код 2FA", device: "Chrome 131 · macOS", place: "Москва · 95.165.•.•", ok: false, warn: true },
    { at: now - 2 * 24 * 60 * min, event: "Вход", device: "Safari · iPadOS", place: "Москва · 176.59.•.•", ok: true },
    { at: now - 4 * 24 * 60 * min, event: "Вход заблокирован: новое устройство без 2FA", device: "Chrome · Android", place: "Минск · 37.214.•.•", ok: false },
    { at: now - 6 * 24 * 60 * min, event: "Вход", device: "Firefox 132 · Windows", place: "Тверь · 188.170.•.•", ok: true },
  ];

  function end(s: Session) {
    setSessions((list) => list.filter((x) => x.id !== s.id));
    toast(`Сессия завершена: ${s.name}`, {
      description: `${s.place} · ${s.ip}`,
      action: { label: "Отменить", onClick: () => setSessions((list) => (list.some((x) => x.id === s.id) ? list : [...list, s].sort((a, b) => b.lastAt - a.lastAt))) },
    });
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 space-y-4">
        <SettingsSection title="Вход в кабинет" description="Кабинет управляет деньгами и командами на сервере — защищайте его как банковское приложение.">
          <SettingRow
            title={
              <span className="flex items-center gap-2">
                Двухфакторная аутентификация
                <Badge tone="ok">
                  <ShieldCheck />
                  Включена
                </Badge>
              </span>
            }
            description="Приложение-аутентификатор с 14 марта 2026. Код запрашиваем при входе с нового устройства и перед выводом денег."
            control={
              <>
                <Button variant="secondary" size="sm" onClick={() => setCodesOpen(true)}>
                  <KeyRound />
                  Резервные коды
                </Button>
                <Button variant="danger-ghost" size="sm" onClick={() => toast.error("Отключить 2FA нельзя", { description: "Владельцу с доступом к выплатам 2FA обязательна" })}>
                  Отключить
                </Button>
              </>
            }
          />
          <SettingRow
            title="Вход через Telegram"
            description="Подтверждение входа кнопкой в @arcticmc_paybot вместо пароля. Привязан аккаунт @artem_kov."
            control={<Badge tone="azure">Подключён</Badge>}
          />
          <SettingRow
            title="Подтверждать вывод денег"
            description="Перед мгновенным выводом и сменой реквизитов спросим код 2FA, даже в текущей сессии"
            control={<Badge tone="ok">Всегда</Badge>}
          />
        </SettingsSection>

        <SettingsSection
          title="Активные сессии"
          description="Где сейчас открыт кабинет под вашим аккаунтом"
          aside={
            sessions.length > 1 ? (
              <Button
                variant="ghost"
                size="xs"
                onClick={() => {
                  const prev = sessions;
                  setSessions((list) => list.filter((s) => s.current));
                  toast(`Завершено сессий: ${prev.length - 1}`, { action: { label: "Отменить", onClick: () => setSessions(prev) } });
                }}
              >
                <LogOut />
                Завершить все, кроме текущей
              </Button>
            ) : null
          }
        >
          {sessions.length === 0 ? (
            <EmptyState title="Нет активных сессий" />
          ) : (
            <ul>
              {sessions.map((s) => {
                const Icon = s.device === "phone" ? Smartphone : s.device === "tablet" ? Tablet : Monitor;
                return (
                  <li key={s.id} className="flex items-center gap-3 border-b border-line-soft px-5 py-3 last:border-0">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-md border border-line bg-surface-2 text-fg-3">
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 text-[13px] text-fg">
                        {s.name}
                        {s.current ? <Badge tone="ok">Это устройство</Badge> : null}
                      </p>
                      <p className="truncate font-mono text-[11.5px] text-fg-3">
                        {s.place} · {s.ip} · {s.current ? "активна сейчас" : formatRelative(s.lastAt, now)}
                      </p>
                    </div>
                    {!s.current ? (
                      <Button variant="ghost" size="xs" onClick={() => end(s)}>
                        Завершить
                      </Button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </SettingsSection>

        <SettingsSection title="История входов" description="Последние 30 дней. Подозрительные попытки дублируем в Telegram.">
          <TableWrap>
            <Table className="min-w-[620px]">
              <THead>
                <TR>
                  <TH>Когда</TH>
                  <TH>Событие</TH>
                  <TH>Устройство</TH>
                  <TH>Откуда</TH>
                </TR>
              </THead>
              <TBody>
                {history.map((h, i) => (
                  <TR key={i}>
                    <TD className="font-mono text-[12px] whitespace-nowrap text-fg-3">{formatDateTime(h.at)}</TD>
                    <TD>
                      <span className="flex items-center gap-2">
                        <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", h.ok ? "bg-ok" : h.warn ? "bg-warn" : "bg-bad")} />
                        <span className={cn(h.ok ? "text-fg-2" : h.warn ? "text-warn" : "text-bad")}>{h.event}</span>
                      </span>
                    </TD>
                    <TD className="whitespace-nowrap text-fg-3">{h.device}</TD>
                    <TD className="font-mono text-[12px] whitespace-nowrap text-fg-3">{h.place}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableWrap>
        </SettingsSection>
      </div>

      <aside className="space-y-4 xl:sticky xl:top-20 xl:self-start">
        <section className="rounded-xl border border-line bg-surface px-5 py-4 shadow-raise">
          <p className="label-mono text-fg-3">2FA в команде</p>
          <p className="mt-2 font-mono text-[22px] leading-none font-medium text-fg nums">
            {team.length - no2fa.length} <span className="text-[14px] text-fg-3">из {team.length}</span>
          </p>
          <div className="mt-3 flex gap-1" aria-hidden>
            {team.map((m) => (
              <span key={m.id} className={cn("h-1.5 flex-1 rounded-full", m.twoFactor ? "bg-ok" : "bg-warn/60")} />
            ))}
          </div>
          {no2fa.length ? (
            <>
              <p className="mt-3 text-[12.5px] text-fg-3">Без 2FA: {no2fa.map((m) => m.name).join(", ")}.</p>
              <Button
                variant="secondary"
                size="sm"
                className="mt-3 w-full"
                onClick={() => toast.success("Напоминания отправлены", { description: no2fa.map((m) => m.email).join(", ") })}
              >
                Напомнить включить
              </Button>
            </>
          ) : null}
        </section>
        <Note>
          Бухгалтер и модератор не видят ключи API и реквизиты выплат, но 2FA всё равно стоит включить: через кабинет можно вернуть деньги или выдать
          привилегию вручную.
        </Note>
      </aside>

      <Dialog open={codesOpen} onOpenChange={setCodesOpen}>
        <DialogContent className="max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Резервные коды</DialogTitle>
            <DialogDescription>Каждый код одноразовый. Осталось 8 из 10 — храните их офлайн, не в той же почте.</DialogDescription>
          </DialogHeader>
          <DialogBody>
            <div className="grid grid-cols-2 gap-1.5 rounded-lg border border-line bg-[#070a10] p-3">
              {BACKUP_CODES.map((c) => (
                <code key={c} className="rounded-sm px-2 py-1 text-center font-mono text-[13px] tracking-[0.08em] text-fg-2">
                  {c}
                </code>
              ))}
            </div>
          </DialogBody>
          <DialogFooter className="justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toast("Новые коды выпущены", { description: "Старые коды больше не работают" })}
            >
              Выпустить новые
            </Button>
            <span className="flex items-center gap-1 text-[12.5px] text-fg-3">
              Скопировать все
              <CopyButton value={BACKUP_CODES.join("\n")} label="Скопировать все коды" />
            </span>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
