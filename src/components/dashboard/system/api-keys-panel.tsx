"use client";

import * as React from "react";
import { KeyRound, Plus, ShieldAlert, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate, formatRelative } from "@/lib/format";
import { NOW_MS } from "@/lib/mock/now";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CopyButton } from "@/components/ui/copy-button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableWrap, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { toast } from "@/components/ui/toaster";
import { Note } from "./settings-ui";

interface ApiKey {
  id: string;
  name: string;
  kind: "publishable" | "secret";
  value: string;
  createdAt: string;
  lastUsedAt: string | null;
  scopes: string[];
}

/** The only right a publishable key may carry: it ends up in public site code. */
const PUBLIC_SCOPE = "products:read";

const SCOPES = [
  { key: "orders:read", hint: "заказы и трассировка" },
  { key: "orders:write", hint: "возвраты и повтор выдачи" },
  { key: "players:read", hint: "профили, LTV, привилегии" },
  { key: "products:read", hint: "каталог и цены" },
  { key: "products:write", hint: "создание и правка товаров" },
  { key: "deliveries:write", hint: "ручная выдача на сервер" },
  { key: "payouts:read", hint: "выплаты и баланс" },
];

const INITIAL: ApiKey[] = [
  {
    id: "key_1",
    name: "Сайт сервера · виджет витрины",
    kind: "publishable",
    value: "pk_live_51HcArc7mQ2t8F2a",
    createdAt: "2026-03-14T16:20:00.000Z",
    lastUsedAt: new Date(NOW_MS - 4 * 60_000).toISOString(),
    scopes: ["products:read"],
  },
  {
    id: "key_2",
    name: "Бот модерации в Telegram",
    kind: "secret",
    value: "sk_live_9VdT0b3nKe4rQ7wd",
    createdAt: "2026-09-02T11:05:00.000Z",
    lastUsedAt: new Date(NOW_MS - 37 * 60_000).toISOString(),
    scopes: ["orders:read", "players:read", "deliveries:write"],
  },
];

function maskSecret(v: string) {
  return `${v.slice(0, 8)}${"•".repeat(8)}${v.slice(-4)}`;
}

export function ApiKeysPanel() {
  const [keys, setKeys] = React.useState(INITIAL);
  const [open, setOpen] = React.useState(false);

  function revoke(k: ApiKey) {
    setKeys((list) => list.filter((x) => x.id !== k.id));
    toast(`Ключ «${k.name}» отозван`, {
      description: "Запросы с ним получат 401",
      action: { label: "Отменить", onClick: () => setKeys((list) => (list.some((x) => x.id === k.id) ? list : [...list, k])) },
    });
  }

  return (
    <section id="api-keys" aria-labelledby="api-title" className="scroll-mt-20">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="api-title" className="text-[15px] font-medium text-fg">
            Ключи API
          </h2>
          <p className="mt-0.5 text-[13px] text-fg-3">
            Публичный ключ — для витрины на вашем сайте. Секретный — только на сервере, показываем один раз.
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setOpen(true)}>
          <Plus />
          Создать ключ
        </Button>
      </div>

      <div className="rounded-xl border border-line bg-surface shadow-raise">
        {keys.length === 0 ? (
          <EmptyState
            icon={<KeyRound />}
            title="Ключей нет"
            description="Создайте ключ, чтобы получать заказы в свой бот или показывать товары на сайте сервера."
            action={
              <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
                <Plus />
                Создать ключ
              </Button>
            }
          />
        ) : (
          <TableWrap>
            <Table className="min-w-[760px]">
              <THead>
                <TR>
                  <TH>Название</TH>
                  <TH>Ключ</TH>
                  <TH>Права</TH>
                  <TH>Создан</TH>
                  <TH>Последний запрос</TH>
                  <TH className="w-10" aria-label="Действия" />
                </TR>
              </THead>
              <TBody>
                {keys.map((k) => (
                  <TR key={k.id}>
                    <TD>
                      <p className="text-[13px] text-fg">{k.name}</p>
                      <p className="text-[11.5px] text-fg-4">{k.kind === "secret" ? "Секретный" : "Публичный"}</p>
                    </TD>
                    <TD>
                      <span className="inline-flex items-center gap-1 rounded-md border border-line bg-surface-2 py-0.5 pr-0.5 pl-2">
                        <code className="font-mono text-[12px] text-fg-2">{k.kind === "secret" ? maskSecret(k.value) : k.value}</code>
                        {k.kind === "publishable" ? <CopyButton value={k.value} label="Скопировать ключ" className="size-6" /> : <span className="w-1" />}
                      </span>
                    </TD>
                    <TD>
                      <span className="flex max-w-[240px] flex-wrap gap-1">
                        {k.scopes.map((s) => (
                          <Badge key={s} tone={s.endsWith(":write") ? "warn" : "neutral"} className="font-mono">
                            {s}
                          </Badge>
                        ))}
                      </span>
                    </TD>
                    <TD className="font-mono text-[12px] whitespace-nowrap text-fg-3">{formatDate(k.createdAt)}</TD>
                    <TD className="font-mono text-[12px] whitespace-nowrap text-fg-3">{k.lastUsedAt ? formatRelative(k.lastUsedAt, NOW_MS) : "ещё не использовался"}</TD>
                    <TD>
                      <Button variant="danger-ghost" size="icon-xs" aria-label={`Отозвать ключ ${k.name}`} onClick={() => revoke(k)}>
                        <Trash2 />
                      </Button>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableWrap>
        )}
      </div>

      <CreateKeyDialog open={open} onOpenChange={setOpen} onCreate={(k) => setKeys((list) => [...list, k])} />
    </section>
  );
}

function CreateKeyDialog({ open, onOpenChange, onCreate }: { open: boolean; onOpenChange: (v: boolean) => void; onCreate: (k: ApiKey) => void }) {
  const [name, setName] = React.useState("");
  const [kind, setKind] = React.useState<ApiKey["kind"]>("secret");
  const [scopes, setScopes] = React.useState<string[]>(["orders:read"]);
  const [expiry, setExpiry] = React.useState("never");
  const [tried, setTried] = React.useState(false);
  const [created, setCreated] = React.useState<ApiKey | null>(null);
  const [seq, setSeq] = React.useState(3);

  const [wasOpen, setWasOpen] = React.useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (open) {
      setName("");
      setKind("secret");
      setScopes(["orders:read"]);
      setExpiry("never");
      setTried(false);
      setCreated(null);
    }
  }

  const nameError = name.trim().length < 3 ? "Минимум 3 символа — чтобы потом понять, где ключ используется" : null;
  const scopeError = kind === "secret" && scopes.length === 0 ? "Выберите хотя бы одно право" : null;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setTried(true);
    if (nameError || scopeError) return;
    const suffix = ["Xb7Lq2", "Mn4Rt8", "Hp9Wd3", "Ka2Zs6"][seq % 4];
    const key: ApiKey = {
      id: `key_${seq}`,
      name: name.trim(),
      kind,
      value: `${kind === "secret" ? "sk" : "pk"}_live_${suffix}c${seq}T0aYe5uN`,
      createdAt: new Date(NOW_MS).toISOString(),
      lastUsedAt: null,
      scopes: kind === "publishable" ? [PUBLIC_SCOPE] : scopes,
    };
    setSeq((s) => s + 1);
    setCreated(key);
    onCreate(key);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[520px]">
        {created ? (
          <>
            <DialogHeader>
              <DialogTitle>Ключ создан</DialogTitle>
              <DialogDescription>«{created.name}» · {created.scopes.join(", ")}</DialogDescription>
            </DialogHeader>
            <DialogBody className="space-y-3">
              <div className="flex items-center gap-1 rounded-md border border-azure-500/40 bg-azure-500/[0.06] py-1.5 pr-1 pl-3">
                <code className="min-w-0 flex-1 truncate font-mono text-[13px] text-fg">{created.value}</code>
                <CopyButton value={created.value} label="Скопировать ключ" />
              </div>
              {created.kind === "secret" ? (
                <Note tone="warn" icon={<ShieldAlert />}>
                  Сохраните ключ сейчас — больше мы его не покажем. Храните только на сервере, не вставляйте в код сайта или плагина, который видят игроки.
                </Note>
              ) : (
                <Note>Публичный ключ можно вставлять в код сайта — он даёт только чтение каталога.</Note>
              )}
            </DialogBody>
            <DialogFooter>
              <Button variant="primary" size="sm" onClick={() => onOpenChange(false)}>
                Я сохранил ключ
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={submit} noValidate>
            <DialogHeader>
              <DialogTitle>Новый ключ API</DialogTitle>
              <DialogDescription>Давайте ключу только те права, которые нужны интеграции.</DialogDescription>
            </DialogHeader>
            <DialogBody className="space-y-4">
              <Field label="Название" htmlFor="key-name" error={tried ? nameError : null} hint="Например: «Сайт сервера» или «Бот в Telegram»">
                <Input id="key-name" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={tried && !!nameError} autoFocus />
              </Field>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field
                  label="Тип"
                  hint={
                    kind === "publishable" ? (
                      <>
                        Только <span className="font-mono text-fg-2">{PUBLIC_SCOPE}</span> — можно вставлять в код сайта
                      </>
                    ) : (
                      "Только для сервера — покажем один раз"
                    )
                  }
                >
                  <div role="radiogroup" aria-label="Тип ключа" className="grid grid-cols-2 gap-1 rounded-lg border border-line bg-surface-2 p-0.5">
                    {(["secret", "publishable"] as const).map((k) => (
                      <button
                        key={k}
                        type="button"
                        role="radio"
                        aria-checked={kind === k}
                        onClick={() => {
                          setKind(k);
                          // a public key only reads the catalog; a secret key starts from the same safe default
                          setScopes(k === "publishable" ? [PUBLIC_SCOPE] : (list) => (list.length ? list : ["orders:read"]));
                        }}
                        className={cn(
                          "h-7 rounded-md text-[12.5px] font-medium transition-colors",
                          kind === k ? "bg-surface-4 text-fg shadow-raise" : "text-fg-3 hover:text-fg-2",
                        )}
                      >
                        {k === "secret" ? "Секретный" : "Публичный"}
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label="Срок действия" htmlFor="key-exp">
                  <Select value={expiry} onValueChange={setExpiry}>
                    <SelectTrigger id="key-exp" size="sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="never">Без срока</SelectItem>
                      <SelectItem value="30">30 дней</SelectItem>
                      <SelectItem value="90">90 дней</SelectItem>
                      <SelectItem value="365">1 год</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <fieldset>
                <legend className="mb-1.5 text-[13px] font-medium text-fg-2">Права</legend>
                <div className="grid gap-x-4 gap-y-2 rounded-lg border border-line px-3.5 py-3 sm:grid-cols-2">
                  {SCOPES.map((s) => {
                    // a public key is locked to the catalog: products:read stays on, everything else is off
                    const locked = kind === "publishable";
                    const disabled = locked && s.key !== PUBLIC_SCOPE;
                    const id = `scope-${s.key}`;
                    return (
                      <label key={s.key} htmlFor={id} className={cn("flex items-start gap-2", disabled ? "opacity-40" : locked ? "" : "cursor-pointer")}>
                        <Checkbox
                          id={id}
                          disabled={locked}
                          checked={locked ? s.key === PUBLIC_SCOPE : scopes.includes(s.key)}
                          onCheckedChange={(v) => setScopes((list) => (v === true ? [...list, s.key] : list.filter((x) => x !== s.key)))}
                          className="mt-0.5"
                        />
                        <span>
                          <span className="block font-mono text-[12px] text-fg-2">{s.key}</span>
                          <span className="block text-[11.5px] text-fg-4">{s.hint}</span>
                        </span>
                      </label>
                    );
                  })}
                </div>
                {tried && scopeError ? <p className="mt-1.5 text-xs text-bad">{scopeError}</p> : null}
              </fieldset>
            </DialogBody>
            <DialogFooter>
              <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                Отмена
              </Button>
              <Button type="submit" variant="primary" size="sm">
                <KeyRound />
                Создать ключ
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
