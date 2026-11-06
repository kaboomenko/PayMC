"use client";

import * as React from "react";
import { Ban, Gauge, LockOpen, MessageSquareText, PackagePlus, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMoney } from "@/lib/format";
import { NOW_MS } from "@/lib/mock/now";
import type { ProductKind } from "@/lib/mock/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, Label, Textarea } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/toaster";
import { usePlayer } from "./player-context";

export interface GrantProduct {
  id: string;
  name: string;
  price: number;
  kind: ProductKind;
  /** delivery commands with the player's nick already filled in */
  commands: string[];
  requireOnline: boolean;
  serverName: string;
}

export interface PlayerBrief {
  id: string;
  name: string;
  online: boolean;
  serverName?: string;
  telegram?: string;
  minorSuspect: boolean;
}

const GRANT_REASONS = ["Компенсация за сбой выдачи", "Приз за ивент", "Перенос с другого аккаунта", "Подарок от администрации", "Другое"];
const LIMITS = [300, 500, 1000, 2000] as const;

export function PlayerActions({ player, products }: { player: PlayerBrief; products: GrantProduct[] }) {
  const { blocked, setBlocked, limit, setLimitOpen } = usePlayer();
  const [grantOpen, setGrantOpen] = React.useState(false);
  const [messageOpen, setMessageOpen] = React.useState(false);
  const [blockOpen, setBlockOpen] = React.useState(false);

  return (
    <>
      <Button size="sm" variant="primary" onClick={() => setGrantOpen(true)}>
        <PackagePlus /> Выдать товар вручную
      </Button>
      <Button size="sm" variant="secondary" onClick={() => setMessageOpen(true)}>
        <MessageSquareText /> Написать в игре
      </Button>
      <Button
        size="sm"
        variant="secondary"
        onClick={() => setLimitOpen(true)}
        className={cn(player.minorSuspect && limit === null && "border-warn/40 text-warn hover:border-warn/60")}
      >
        <Gauge /> {limit ? `Лимит ${formatMoney(limit)}/день` : "Лимит трат"}
      </Button>
      {blocked ? (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setBlocked(false);
            toast.success(`Покупки ${player.name} снова разрешены`);
          }}
        >
          <LockOpen /> Разблокировать
        </Button>
      ) : (
        <Button size="sm" variant="danger-ghost" onClick={() => setBlockOpen(true)}>
          <Ban /> Заблокировать покупки
        </Button>
      )}

      <GrantDialog key={grantOpen ? "open" : "closed"} open={grantOpen} onOpenChange={setGrantOpen} player={player} products={products} />
      <MessageDialog key={messageOpen ? "m-open" : "m-closed"} open={messageOpen} onOpenChange={setMessageOpen} player={player} />
      <LimitDialog player={player} />
      <BlockDialog open={blockOpen} onOpenChange={setBlockOpen} player={player} />
    </>
  );
}

/** Prominent nudge for players flagged as possibly under-age. */
export function MinorLimitBanner({ name }: { name: string }) {
  const { limit, setLimitOpen } = usePlayer();
  return (
    <div className="mb-5 flex flex-col gap-3 rounded-xl border border-warn/25 bg-warn-soft px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <ShieldAlert className="mt-0.5 size-4 shrink-0 text-warn" />
        <div>
          <p className="text-[13px] font-medium text-fg">
            {limit ? `Дневной лимит ${formatMoney(limit)} включён` : `${name}, возможно, несовершеннолетний`}
          </p>
          <p className="mt-0.5 text-[12.5px] text-fg-2">
            {limit
              ? "Платежи сверх лимита отклоняются, игрок видит понятное объяснение. Родителям можно отправить ссылку на отчёт о тратах."
              : "Покупки ночью, много мелких платежей с одной карты. Включите дневной лимит — это защищает и игрока, и вас от возвратов."}
          </p>
        </div>
      </div>
      <Button size="sm" variant="secondary" className="shrink-0" onClick={() => setLimitOpen(true)}>
        <Gauge /> {limit ? "Изменить лимит" : "Включить лимит"}
      </Button>
    </div>
  );
}

function GrantDialog({
  open,
  onOpenChange,
  player,
  products,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  player: PlayerBrief;
  products: GrantProduct[];
}) {
  const { addGrant, removeGrant } = usePlayer();
  const [productId, setProductId] = React.useState(products[0]?.id ?? "");
  const [reason, setReason] = React.useState(GRANT_REASONS[0]);
  const product = products.find((p) => p.id === productId);
  const waits = Boolean(product?.requireOnline && !player.online);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!product) return;
            const id = addGrant({
              items: [{ name: product.name, qty: 1 }],
              amount: 0,
              status: waits ? "awaiting_player" : "delivered",
              createdAt: new Date(NOW_MS).toISOString(),
              serverName: product.serverName,
              manual: { reason },
            });
            onOpenChange(false);
            toast.success(`${product.name} → ${player.name}`, {
              description: waits ? "Игрок не в сети — выдадим при входе на сервер" : `Выдано вручную · ${reason.toLowerCase()}`,
              action: { label: "Отменить", onClick: () => removeGrant(id) },
            });
          }}
        >
          <DialogHeader>
            <DialogTitle>Выдать товар вручную</DialogTitle>
            <DialogDescription>
              Без оплаты: в отчётах заказ попадёт в «Выдано вручную», в выручку не войдёт. Команды выполнит агент сервера.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Товар" htmlFor="grant-product">
                <Select value={productId} onValueChange={setProductId}>
                  <SelectTrigger id="grant-product">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        <span className="flex w-full items-center justify-between gap-4">
                          {p.name}
                          <span className="font-mono text-[11px] text-fg-4">{formatMoney(p.price)}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Причина" htmlFor="grant-reason">
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger id="grant-reason">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GRANT_REASONS.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            {product ? (
              <div className="overflow-hidden rounded-lg border border-line bg-[#06080c]">
                <p className="label-mono flex items-center justify-between border-b border-line-soft px-3 py-2 text-[10px] text-fg-4">
                  <span>Выполнится на «{product.serverName}»</span>
                  {waits ? <span className="text-ice-300 normal-case tracking-normal">ждёт входа игрока</span> : null}
                </p>
                <div className="px-3 py-2 font-mono text-[11.5px] leading-[1.7] text-fg-2">
                  {product.commands.map((c) => (
                    <p key={c} className="break-all">
                      <span className="text-fg-4 select-none">$ </span>
                      {c}
                    </p>
                  ))}
                </div>
              </div>
            ) : null}
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={!product}>
              <PackagePlus /> Выдать {player.name}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type Channel = "chat" | "title" | "actionbar";

function MessageDialog({ open, onOpenChange, player }: { open: boolean; onOpenChange: (v: boolean) => void; player: PlayerBrief }) {
  const [channel, setChannel] = React.useState<Channel>("chat");
  const [text, setText] = React.useState(`Привет, ${player.name}! Спасибо, что играешь у нас.`);
  const [telegram, setTelegram] = React.useState(Boolean(player.telegram));
  const max = channel === "chat" ? 200 : 60;
  const tooLong = text.length > max;
  const empty = !text.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (tooLong || empty) return;
            onOpenChange(false);
            toast.success(player.online ? `Сообщение показано ${player.name}` : `Сообщение ждёт ${player.name}`, {
              description: player.online
                ? `${channel === "chat" ? "Чат" : channel === "title" ? "Титр на экране" : "Экшнбар"} · ${player.serverName}${telegram ? " · копия в Telegram" : ""}`
                : `Покажем при входе на сервер${telegram ? ", копия уже в Telegram" : ""}`,
            });
          }}
        >
          <DialogHeader>
            <DialogTitle>Написать {player.name} в игре</DialogTitle>
            <DialogDescription>
              {player.online ? `Игрок сейчас на сервере «${player.serverName}» — увидит сразу.` : "Игрок не в сети — покажем сообщение при входе."}
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <Label>Где показать</Label>
              <Segmented<Channel>
                value={channel}
                onChange={setChannel}
                options={[
                  { value: "chat", label: "Чат" },
                  { value: "title", label: "Титр" },
                  { value: "actionbar", label: "Экшнбар" },
                ]}
              />
            </div>
            <Field
              label="Текст"
              htmlFor="msg-text"
              error={tooLong ? `Длиннее ${max} символов — в игре обрежется` : empty ? "Напишите хоть пару слов" : undefined}
              aside={<span className={cn("font-mono text-[11px] nums", tooLong ? "text-bad" : "text-fg-4")}>{text.length}/{max}</span>}
            >
              <Textarea id="msg-text" value={text} onChange={(e) => setText(e.target.value)} aria-invalid={tooLong || empty} rows={3} />
            </Field>

            <div aria-label="Предпросмотр в игре" className="relative h-[150px] overflow-hidden rounded-lg border border-line bg-[linear-gradient(180deg,#0d1a2a_0%,#13283a_55%,#1f3a2a_56%,#16281d_100%)]">
              <span className="label-mono absolute top-2 right-2.5 text-[9.5px] text-white/40">предпросмотр</span>
              {channel === "chat" ? (
                <div className="absolute bottom-9 left-3 max-w-[85%] space-y-0.5 font-mono text-[12px] leading-[1.45] [text-shadow:1px_1px_0_rgb(0_0_0/0.8)]">
                  <p className="w-fit bg-black/35 px-1.5 text-white/60">&lt;Sneg_mc&gt; кто на спавн?</p>
                  <p className="w-fit bg-black/35 px-1.5 break-all">
                    <span className="text-ice-300">[ArcticMC → {player.name}]</span> <span className="text-white">{text || "…"}</span>
                  </p>
                </div>
              ) : channel === "title" ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center [text-shadow:2px_2px_0_rgb(0_0_0/0.7)]">
                  <p className="font-display text-[22px] leading-tight font-semibold break-all text-white">{text || "…"}</p>
                  <p className="mt-1 text-[11px] text-ice-200">ArcticMC</p>
                </div>
              ) : (
                <div className="absolute inset-x-0 bottom-9 flex justify-center px-4">
                  <p className="text-center text-[12.5px] break-all text-ice-200 [text-shadow:1px_1px_0_rgb(0_0_0/0.8)]">{text || "…"}</p>
                </div>
              )}
              {/* hotbar */}
              <div className="absolute inset-x-0 bottom-2 flex justify-center gap-[2px]" aria-hidden>
                {Array.from({ length: 9 }).map((_, i) => (
                  <span key={i} className={cn("size-[18px] border border-black/60 bg-white/10", i === 0 && "border-white/80")} />
                ))}
              </div>
            </div>

            {player.telegram ? (
              <label className="flex cursor-pointer items-center gap-2.5 text-[13px] text-fg-2">
                <Checkbox checked={telegram} onCheckedChange={(v) => setTelegram(v === true)} />
                Продублировать в Telegram <span className="font-mono text-[12px] text-fg-3">{player.telegram}</span>
              </label>
            ) : (
              <p className="text-xs text-fg-4">Telegram не привязан — сообщение увидят только в игре.</p>
            )}
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={tooLong || empty}>
              <MessageSquareText /> Отправить
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function LimitDialog({ player }: { player: PlayerBrief }) {
  const { limit, setLimit, limitOpen, setLimitOpen } = usePlayer();
  const [value, setValue] = React.useState<string>(String(limit ?? (player.minorSuspect ? 500 : 1000)));
  return (
    <Dialog open={limitOpen} onOpenChange={setLimitOpen}>
      <DialogContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const next = value === "none" ? null : Number(value);
            setLimit(next);
            setLimitOpen(false);
            toast.success(next ? `Лимит ${formatMoney(next)} в день для ${player.name}` : `Лимит для ${player.name} снят`, {
              description: next ? "Сверх лимита платёж не пройдёт — игрок увидит объяснение в магазине" : undefined,
            });
          }}
        >
          <DialogHeader>
            <DialogTitle>Лимит трат для {player.name}</DialogTitle>
            <DialogDescription>Родительский контроль: сколько игрок может потратить за сутки (по МСК).</DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-4">
            {player.minorSuspect ? (
              <div className="flex items-start gap-2.5 rounded-lg border border-warn/25 bg-warn-soft px-3 py-2.5 text-[12.5px] text-fg-2">
                <ShieldAlert className="mt-0.5 size-4 shrink-0 text-warn" />
                Антифрод отметил: возможно, платит ребёнок. С лимитом 500 ₽ возвратов по таким игрокам почти не бывает.
              </div>
            ) : null}
            <Field label="Дневной лимит" htmlFor="limit-select" hint="Действует на все способы оплаты и все серверы проекта">
              <Select value={value} onValueChange={setValue}>
                <SelectTrigger id="limit-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LIMITS.map((l) => (
                    <SelectItem key={l} value={String(l)}>
                      {formatMoney(l)} в день
                    </SelectItem>
                  ))}
                  <SelectSeparator />
                  <SelectItem value="none">Без лимита</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setLimitOpen(false)}>
              Отмена
            </Button>
            <Button type="submit" variant="primary" size="sm">
              <Gauge /> Сохранить
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function BlockDialog({ open, onOpenChange, player }: { open: boolean; onOpenChange: (v: boolean) => void; player: PlayerBrief }) {
  const { setBlocked } = usePlayer();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Заблокировать покупки {player.name}?</DialogTitle>
          <DialogDescription>
            Игрок не сможет оплатить заказ в магазине и в игре. Уже выданное останется, бан на сервере не ставится.
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <div className="flex flex-wrap gap-1.5">
            <Badge tone="outline">Платежи отклоняются</Badge>
            <Badge tone="outline">Промокоды не работают</Badge>
            <Badge tone="outline">Можно снять в любой момент</Badge>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              setBlocked(true);
              onOpenChange(false);
              toast.success(`Покупки ${player.name} заблокированы`, {
                action: { label: "Отменить", onClick: () => setBlocked(false) },
              });
            }}
          >
            <Ban /> Заблокировать
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Small badge in the header once purchases are blocked. */
export function BlockedBadge() {
  const { blocked } = usePlayer();
  if (!blocked) return null;
  return (
    <Badge tone="bad" dot>
      Покупки заблокированы
    </Badge>
  );
}
