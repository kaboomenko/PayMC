"use client";

import * as React from "react";
import Link from "next/link";
import { Mail, MoreHorizontal, ShieldCheck, ShieldOff, UserMinus, UserPlus, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRelative } from "@/lib/format";
import { memberRoleMeta } from "@/lib/mock/meta";
import type { MemberRole } from "@/lib/mock/types";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import { Table, TableWrap, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { toast } from "@/components/ui/toaster";
import type { AuditEntry, TeamRow } from "./settings-types";

const ASSIGNABLE: MemberRole[] = ["admin", "developer", "moderator", "accountant"];
const AREA_LABEL: Record<AuditEntry["area"], string> = { finance: "Финансы", catalog: "Товары", access: "Доступ", servers: "Серверы" };

export function TeamSettings({ team: initial, audit, now }: { team: TeamRow[]; audit: AuditEntry[]; now: number }) {
  const [team, setTeam] = React.useState(initial);
  const [inviteOpen, setInviteOpen] = React.useState(false);
  const [area, setArea] = React.useState<"all" | AuditEntry["area"]>("all");
  const log = area === "all" ? audit : audit.filter((a) => a.area === area);

  function changeRole(m: TeamRow, role: MemberRole) {
    const prev = m.role;
    setTeam((list) => list.map((x) => (x.id === m.id ? { ...x, role } : x)));
    toast.success(`${m.name}: ${memberRoleMeta[role].label.toLowerCase()}`, {
      description: memberRoleMeta[role].description,
      action: { label: "Отменить", onClick: () => setTeam((list) => list.map((x) => (x.id === m.id ? { ...x, role: prev } : x))) },
    });
  }

  function remove(m: TeamRow) {
    const idx = team.findIndex((x) => x.id === m.id);
    setTeam((list) => list.filter((x) => x.id !== m.id));
    toast(`${m.name} удалён из команды`, {
      description: "Доступ к кабинету закрыт, все сессии завершены",
      action: {
        label: "Вернуть",
        onClick: () => setTeam((list) => (list.some((x) => x.id === m.id) ? list : [...list.slice(0, idx), m, ...list.slice(idx)])),
      },
    });
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-line bg-surface shadow-raise">
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line-soft px-5 py-4">
          <div>
            <h2 className="text-sm font-medium text-fg">Команда</h2>
            <p className="mt-0.5 text-[13px] text-fg-3">Роль определяет, что человек видит и меняет. Доли выплат — во вкладке «Распределение» в финансах.</p>
          </div>
          <Button variant="primary" size="sm" onClick={() => setInviteOpen(true)}>
            <UserPlus />
            Пригласить
          </Button>
        </header>
        {/* phones: one card per person — role, 2FA and share stay visible without sideways scrolling */}
        <ul className="md:hidden">
          {team.map((m) => (
            <li key={m.id} className="border-b border-line-soft px-4 py-3 last:border-0">
              <div className="flex items-start gap-2.5">
                <MemberIdentity m={m} />
                <MemberActions m={m} onRemove={remove} />
              </div>
              <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-2 pl-[38px]">
                <RoleControl m={m} onChange={changeRole} />
                <TwoFactor m={m} />
                {m.splitPct > 0 ? <span className="font-mono text-[12px] text-fg-2 nums">{m.splitPct} % выплат</span> : null}
                {!m.invited ? <span className="font-mono text-[11.5px] text-fg-4">{formatRelative(m.lastActiveAt, now)}</span> : null}
              </div>
            </li>
          ))}
        </ul>

        <TableWrap className="hidden md:block">
          <Table className="min-w-[720px]">
            <THead>
              <TR>
                <TH>Участник</TH>
                <TH>Роль</TH>
                <TH>2FA</TH>
                <TH>Активность</TH>
                <TH className="text-right">Доля выплат</TH>
                <TH className="w-10" aria-label="Действия" />
              </TR>
            </THead>
            <TBody>
              {team.map((m) => (
                <TR key={m.id}>
                  <TD>
                    <MemberIdentity m={m} />
                  </TD>
                  <TD>
                    <RoleControl m={m} onChange={changeRole} />
                  </TD>
                  <TD>
                    <TwoFactor m={m} compact />
                  </TD>
                  <TD className="font-mono text-[12px] whitespace-nowrap text-fg-3">{m.invited ? "—" : formatRelative(m.lastActiveAt, now)}</TD>
                  <TD className="text-right font-mono nums">{m.splitPct > 0 ? <span className="text-fg">{m.splitPct} %</span> : <span className="text-fg-4">—</span>}</TD>
                  <TD>
                    <MemberActions m={m} onRemove={remove} />
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </TableWrap>
      </section>

      <section className="rounded-xl border border-line bg-surface shadow-raise">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line-soft px-5 py-3.5">
          <div>
            <h2 className="text-sm font-medium text-fg">Журнал действий</h2>
            <p className="mt-0.5 text-[12.5px] text-fg-3">Кто, что и когда менял. Хранится 1 год, нельзя удалить даже владельцу.</p>
          </div>
          <div className="-mx-1 max-w-full overflow-x-auto px-1 scrollbar-none">
            <Segmented
              size="xs"
              value={area}
              onChange={setArea}
              options={[
                { value: "all", label: "Все" },
                { value: "finance", label: "Финансы" },
                { value: "catalog", label: "Товары" },
                { value: "access", label: "Доступ" },
                { value: "servers", label: "Серверы" },
              ]}
            />
          </div>
        </header>
        {log.length === 0 ? (
          <EmptyState title="Записей нет" description="В этом разделе за последний год ничего не меняли." />
        ) : (
          <ol>
            {log.map((a) => (
              <li key={a.id} className="grid grid-cols-[28px_minmax(0,1fr)] gap-3 border-b border-line-soft px-5 py-3.5 last:border-0 sm:grid-cols-[28px_minmax(0,1fr)_auto]">
                <Avatar name={a.actor} size={28} />
                <div className="min-w-0">
                  <p className="text-[13px] leading-snug text-fg-2">
                    <span className="font-medium text-fg">{a.actor}</span> {a.action}
                    {a.target ? <span className="text-fg"> «{a.target}»</span> : null}
                  </p>
                  {a.diff ? (
                    <div className="mt-1.5 overflow-hidden rounded-md border border-line-soft bg-[#070a10] font-mono text-[12px] leading-relaxed">
                      <p className="break-words bg-bad/[0.07] px-2.5 text-bad/90">
                        <span className="mr-2 text-bad/60 select-none">−</span>
                        {a.diff.before}
                      </p>
                      <p className="break-words bg-ok/[0.07] px-2.5 text-ok/90">
                        <span className="mr-2 text-ok/60 select-none">+</span>
                        {a.diff.after}
                      </p>
                    </div>
                  ) : null}
                  <p className="mt-1 font-mono text-[11px] text-fg-4 sm:hidden">
                    {formatRelative(a.at, now)} · {a.ip}
                  </p>
                </div>
                <div className="hidden text-right sm:block">
                  <p className="font-mono text-[12px] text-fg-3">{formatRelative(a.at, now)}</p>
                  <p className="font-mono text-[11px] text-fg-4">{a.ip}</p>
                  <p className="mt-1">
                    <Badge tone="outline">{AREA_LABEL[a.area]}</Badge>
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <InviteDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        existing={team.map((m) => m.email)}
        onInvite={(email, role) => {
          const row: TeamRow = { id: `inv-${email}`, name: email, email, role, splitPct: 0, lastActiveAt: new Date(now).toISOString(), twoFactor: false, invited: true };
          setTeam((list) => [...list, row]);
          toast.success("Приглашение отправлено", {
            description: `${email} · ${memberRoleMeta[role].label.toLowerCase()}`,
            action: { label: "Отозвать", onClick: () => setTeam((list) => list.filter((x) => x.id !== row.id)) },
          });
        }}
      />
    </div>
  );
}

function MemberIdentity({ m }: { m: TeamRow }) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2.5">
      <Avatar name={m.name} size={28} className={cn("shrink-0", m.invited && "opacity-50")} />
      <div className="min-w-0">
        <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px] text-fg">
          {m.invited ? <span className="min-w-0 truncate text-fg-3">{m.email}</span> : m.name}
          {m.invited ? <Badge tone="ice">Приглашён</Badge> : null}
        </p>
        <p className="truncate text-[12px] text-fg-4">{m.invited ? "ссылка действует 7 дней" : m.email}</p>
      </div>
    </div>
  );
}

function RoleControl({ m, onChange }: { m: TeamRow; onChange: (m: TeamRow, role: MemberRole) => void }) {
  if (m.role === "owner") return <span className="flex h-8 items-center text-[13px] text-fg-2">{memberRoleMeta.owner.label}</span>;
  return (
    <Select value={m.role} onValueChange={(v) => onChange(m, v as MemberRole)}>
      <SelectTrigger size="sm" className="w-[170px]" aria-label={`Роль: ${m.name}`}>
        <span>{memberRoleMeta[m.role].label}</span>
      </SelectTrigger>
      <SelectContent className="w-[300px] max-w-[calc(100vw-32px)]">
        {ASSIGNABLE.map((r) => (
          <SelectItem key={r} value={r} className="h-auto py-1.5">
            <span className="block text-[13px] text-fg">{memberRoleMeta[r].label}</span>
            <span className="block text-[11.5px] leading-snug text-fg-3">{memberRoleMeta[r].description}</span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** In the table the column says «2FA»; on phones the badge has to say it itself. */
function TwoFactor({ m, compact }: { m: TeamRow; compact?: boolean }) {
  if (m.invited) return compact ? <span className="text-fg-4">—</span> : null;
  return m.twoFactor ? (
    <Badge tone="ok">
      <ShieldCheck />
      {compact ? "Включена" : "2FA включена"}
    </Badge>
  ) : (
    <Badge tone="warn">
      <ShieldOff />
      {compact ? "Нет" : "Без 2FA"}
    </Badge>
  );
}

function MemberActions({ m, onRemove }: { m: TeamRow; onRemove: (m: TeamRow) => void }) {
  if (m.role === "owner") return <span className="size-7 shrink-0" />;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-xs" aria-label={`Действия: ${m.name}`} className="shrink-0">
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href="/dashboard/finance?tab=split">
            <Wallet />
            Изменить долю выплат
          </Link>
        </DropdownMenuItem>
        {!m.twoFactor && !m.invited ? (
          <DropdownMenuItem onSelect={() => toast.success("Напоминание отправлено", { description: `${m.email} · включить 2FA в течение 7 дней` })}>
            <Mail />
            Напомнить про 2FA
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem destructive onSelect={() => onRemove(m)}>
          <UserMinus />
          {m.invited ? "Отозвать приглашение" : "Удалить из команды"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function InviteDialog({
  open,
  onOpenChange,
  existing,
  onInvite,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  existing: string[];
  onInvite: (email: string, role: MemberRole) => void;
}) {
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState<MemberRole>("moderator");
  const [tried, setTried] = React.useState(false);
  const [wasOpen, setWasOpen] = React.useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (open) {
      setEmail("");
      setRole("moderator");
      setTried(false);
    }
  }
  const value = email.trim().toLowerCase();
  const error = !value
    ? "Укажите почту"
    : !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)
      ? "Похоже, в адресе опечатка"
      : existing.includes(value)
        ? "Этот человек уже в команде"
        : null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setTried(true);
    if (error) return;
    onInvite(value, role);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[500px]">
        <form onSubmit={submit} noValidate>
          <DialogHeader>
            <DialogTitle>Пригласить в команду</DialogTitle>
            <DialogDescription>Пришлём ссылку на почту. Войти можно через почту или Telegram, 2FA попросим включить сразу.</DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <Field label="Почта" htmlFor="inv-email" error={tried ? error : null}>
              <Input
                id="inv-email"
                type="email"
                placeholder="moder@arcticmc.ru"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={tried && !!error}
                autoComplete="off"
              />
            </Field>
            <fieldset>
              <legend className="mb-1.5 text-[13px] font-medium text-fg-2">Роль</legend>
              <div role="radiogroup" className="grid gap-1.5">
                {ASSIGNABLE.map((r) => (
                  <button
                    key={r}
                    type="button"
                    role="radio"
                    aria-checked={role === r}
                    onClick={() => setRole(r)}
                    className={cn(
                      "flex items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors",
                      role === r ? "border-azure-500/60 bg-azure-500/[0.07]" : "border-line hover:border-line-strong",
                    )}
                  >
                    <span aria-hidden className={cn("mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border", role === r ? "border-azure-400 bg-azure-500" : "border-line-strong")}>
                      {role === r ? <span className="size-1.5 rounded-full bg-white" /> : null}
                    </span>
                    <span>
                      <span className="block text-[13px] font-medium text-fg">{memberRoleMeta[r].label}</span>
                      <span className="block text-[12px] text-fg-3">{memberRoleMeta[r].description}</span>
                    </span>
                  </button>
                ))}
              </div>
            </fieldset>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" variant="primary" size="sm">
              <Mail />
              Отправить приглашение
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
