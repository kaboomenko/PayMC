"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Download, Gift, RotateCw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMoney, formatNumber, formatRelative, plural } from "@/lib/format";
import { PAYMENT_METHODS } from "@/lib/payments";
import { NOW_MS } from "@/lib/mock/now";
import { orderStatusMeta } from "@/lib/mock/meta";
import type { OrderStatus, TraceStep } from "@/lib/mock/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { PixelAvatar } from "@/components/ui/avatar";
import { Table, TableWrap, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { toast } from "@/components/ui/toaster";
import { Tooltip } from "@/components/ui/tooltip";
import { formatDeliveryTime, formatExact } from "./format";
import { OrderSheet, RETRYABLE, type OrderOverride } from "./order-sheet";
import { ordersHref, type OrdersQuery } from "./params";
import { revokeFor } from "./refund-dialog";
import type { OrderDetail, OrderRow, ServerOption } from "./types";
import { useUrlNav } from "./url-nav";

const SERVER_DOT = { online: "", degraded: "bg-warn", offline: "bg-bad" } as const;

let stepSeq = 0;
function manualStep(partial: Omit<TraceStep, "id" | "at">, offsetMs: number): TraceStep {
  stepSeq += 1;
  // the demo clock is frozen at NOW — manual actions happen "right now"
  return { id: `manual-${stepSeq}`, at: new Date(NOW_MS + offsetMs).toISOString(), ...partial };
}

export function OrdersTable({
  rows,
  query,
  detail,
  servers,
  empty,
}: {
  rows: OrderRow[];
  query: OrdersQuery;
  detail: OrderDetail | null;
  servers: ServerOption[];
  empty: React.ReactNode;
}) {
  const { navigate, detailPending, listPending } = useUrlNav();
  const reduce = useReducedMotion();
  const [openId, setOpenId] = React.useOptimistic<string | null>(query.id ?? null);
  const [selected, setSelected] = React.useState<Set<string>>(() => new Set());
  const [overrides, setOverrides] = React.useState<Record<string, OrderOverride>>({});
  const serverById = React.useMemo(() => new Map(servers.map((s) => [s.id, s])), [servers]);

  // selection belongs to the visible page — drop it when the page changes
  const pageKey = rows.map((r) => r.id).join(",");
  const [seenKey, setSeenKey] = React.useState(pageKey);
  if (pageKey !== seenKey) {
    setSeenKey(pageKey);
    setSelected(new Set());
  }

  const open = React.useCallback(
    (id: string) => navigate(ordersHref(query, { id }), { detail: true, optimistic: () => setOpenId(id) }),
    [navigate, query, setOpenId],
  );
  const close = React.useCallback(
    () => navigate(ordersHref(query, { id: undefined }), { detail: true, optimistic: () => setOpenId(null) }),
    [navigate, query, setOpenId],
  );

  // J / K — next / previous order of the current page while the drawer is open
  const index = openId ? rows.findIndex((r) => r.id === openId) : -1;
  React.useEffect(() => {
    if (!openId || index < 0) return;
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (document.querySelectorAll('[role="dialog"]').length > 1) return; // refund dialog on top
      const step = e.code === "KeyJ" ? 1 : e.code === "KeyK" ? -1 : 0;
      if (!step) return;
      const next = rows[index + step];
      if (!next) return;
      e.preventDefault();
      open(next.id);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openId, index, rows, open]);

  const statusOf = (r: OrderRow) => overrides[r.id]?.status ?? r.status;

  const retry = (ids: string[], source: "bulk" | "sheet") => {
    if (!ids.length) return;
    const snapshot = overrides;
    const next = { ...overrides };
    for (const id of ids) {
      next[id] = {
        status: "delivering",
        steps: [
          ...(overrides[id]?.steps ?? []),
          manualStep({ kind: "queued", title: "Повторная выдача запущена вручную", detail: "Артём Ковалёв · из кабинета", status: "ok" }, 400),
          manualStep({ kind: "sent", title: "Задание отправлено агенту", detail: "Ждём подтверждения сервера", status: "pending" }, 460),
        ],
      };
    }
    setOverrides(next);
    toast.success(
      ids.length === 1 ? `Выдача ${ids[0]} запущена заново` : `Повторная выдача: ${formatNumber(ids.length)} ${plural(ids.length, ["заказ", "заказа", "заказов"])}`,
      {
        description: source === "bulk" ? "Команды уйдут агентам серверов в течение минуты" : "Агент выполнит команды, как только сервер ответит",
        action: { label: "Отменить", onClick: () => setOverrides(snapshot) },
      },
    );
  };

  const refund = (id: string, r: { amount: number; revoke: boolean; reason: string; commands: string[] }) => {
    const snapshot = overrides;
    const steps: TraceStep[] = [
      ...(overrides[id]?.steps ?? []),
      manualStep({ kind: "refund", title: `Возврат ${formatMoney(r.amount)} оформлен`, detail: `Инициатор: Артём Ковалёв · «${r.reason}»`, status: "warn" }, 300),
    ];
    if (r.revoke) {
      r.commands
        .map(revokeFor)
        .filter((c): c is string => Boolean(c))
        .forEach((c, i) => steps.push(manualStep({ kind: "executed", title: "Снимаем выданное", command: c, status: "pending" }, 340 + i * 20)));
    }
    setOverrides({ ...overrides, [id]: { status: "refunded", steps } });
    toast.success(`Возврат ${formatMoney(r.amount)} по ${id}`, {
      description: r.revoke ? "Выданное снимем командами отмены" : "Покупка остаётся у игрока",
      action: { label: "Отменить", onClick: () => setOverrides(snapshot) },
    });
  };

  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const someSelected = !allSelected && rows.some((r) => selected.has(r.id));
  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const selectedRows = rows.filter((r) => selected.has(r.id));
  const retryable = selectedRows.filter((r) => RETRYABLE.includes(statusOf(r)));

  const clearSelection = () => {
    const snapshot = new Set(selected);
    setSelected(new Set());
    toast(`Выделение снято · ${formatNumber(snapshot.size)}`, { action: { label: "Вернуть", onClick: () => setSelected(snapshot) } });
  };

  const exportSelected = () => {
    toast.success(`CSV: ${formatNumber(selectedRows.length)} ${plural(selectedRows.length, ["заказ", "заказа", "заказов"])}`, {
      description: "orders-selected.csv · UTF-8 с BOM, откроется в Excel без кракозябр",
    });
  };

  const openRow = rows.find((r) => r.id === openId);

  return (
    <>
      {rows.length === 0 ? (
        empty
      ) : (
        <div aria-busy={listPending} className={cn("transition-opacity duration-150", listPending && "opacity-55")}>
          {/* Desktop / tablet: dense table */}
          <TableWrap className="hidden md:block">
            <Table className="min-w-[920px]">
              <THead>
                <TR>
                  <TH className="w-11 pr-0">
                    <Checkbox
                      aria-label="Выбрать все заказы на странице"
                      checked={allSelected ? true : someSelected ? "indeterminate" : false}
                      onCheckedChange={(v) => setSelected(v === true ? new Set(rows.map((r) => r.id)) : new Set())}
                    />
                  </TH>
                  <TH>Заказ</TH>
                  <TH>Игрок</TH>
                  <TH className="w-full">Товары</TH>
                  <TH className="text-right">Сумма</TH>
                  <TH>Способ</TH>
                  <TH>Сервер</TH>
                  <TH>Выдача</TH>
                  <TH className="text-right">Время</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((r) => {
                  const server = serverById.get(r.serverId);
                  const isOpen = r.id === openId;
                  return (
                    <TR
                      key={r.id}
                      interactive
                      data-selected={selected.has(r.id) || undefined}
                      onClick={() => open(r.id)}
                      className={cn(isOpen && "bg-azure-500/[0.07] hover:bg-azure-500/[0.09]")}
                    >
                      <TD className="w-11 pr-0" onClick={(e) => e.stopPropagation()}>
                        <Checkbox aria-label={`Выбрать ${r.id}`} checked={selected.has(r.id)} onCheckedChange={() => toggle(r.id)} />
                      </TD>
                      <TD className="whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            open(r.id);
                          }}
                          className={cn(
                            "rounded-xs font-mono text-[12.5px] nums transition-colors hover:text-azure-200",
                            isOpen ? "text-azure-200" : "text-fg",
                          )}
                        >
                          {r.id}
                        </button>
                      </TD>
                      <TD className="whitespace-nowrap">
                        <span className="flex max-w-[170px] items-center gap-2">
                          <PixelAvatar name={r.playerName} size={20} />
                          <span className="truncate text-fg">{r.playerName}</span>
                          {r.giftTo ? (
                            <Tooltip content={`Подарок для ${r.giftTo}`}>
                              <span className="inline-flex text-ice-300" aria-label={`Подарок для ${r.giftTo}`}>
                                <Gift className="size-3.5" />
                              </span>
                            </Tooltip>
                          ) : null}
                        </span>
                      </TD>
                      <TD className="max-w-0">
                        <ItemsText items={r.items} />
                      </TD>
                      <TD className="text-right whitespace-nowrap">
                        <span className="inline-flex items-center gap-2">
                          <SourceTag row={r} />
                          <span className="font-mono text-fg nums">{formatMoney(r.amount)}</span>
                        </span>
                      </TD>
                      <TD className="whitespace-nowrap text-fg-2">{PAYMENT_METHODS[r.method].short}</TD>
                      <TD className="whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5">
                          {server && server.status !== "online" ? (
                            <Tooltip content={server.status === "offline" ? "Сервер без связи — заказ ждёт в очереди" : "Сервер медленно отвечает"}>
                              <span className={cn("size-1.5 rounded-full", SERVER_DOT[server.status])} />
                            </Tooltip>
                          ) : null}
                          {server?.name ?? r.serverId}
                        </span>
                      </TD>
                      <TD className="whitespace-nowrap">
                        <DeliveryCell status={statusOf(r)} deliveryMs={r.deliveryMs} manual={Boolean(overrides[r.id])} serverOffline={serverById.get(r.serverId)?.status === "offline"} retry={r.retry} />
                      </TD>
                      <TD className="text-right whitespace-nowrap">
                        <Tooltip content={formatExact(r.createdAt)} side="left">
                          <span className="text-[12.5px] text-fg-3 nums">{formatRelative(r.createdAt, NOW_MS)}</span>
                        </Tooltip>
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          </TableWrap>

          {/* Phone: stacked rows */}
          <ul className="divide-y divide-line-soft md:hidden">
            {rows.map((r) => (
              <li key={r.id} className={cn("flex items-start gap-3 px-4 py-3", selected.has(r.id) && "bg-azure-500/[0.06]")}>
                <Checkbox aria-label={`Выбрать ${r.id}`} checked={selected.has(r.id)} onCheckedChange={() => toggle(r.id)} className="mt-1" />
                <button type="button" onClick={() => open(r.id)} className="min-w-0 flex-1 text-left">
                  <span className="flex items-center justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-2">
                      <PixelAvatar name={r.playerName} size={18} />
                      <span className="truncate text-[13px] font-medium text-fg">{r.playerName}</span>
                      {r.giftTo ? <Gift className="size-3.5 shrink-0 text-ice-300" aria-label={`Подарок для ${r.giftTo}`} /> : null}
                    </span>
                    <span className="shrink-0 font-mono text-[13px] text-fg nums">{formatMoney(r.amount)}</span>
                  </span>
                  <span className="mt-0.5 flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate text-[12.5px] text-fg-3">
                      {r.items.map((it) => (it.qty > 1 ? `${it.name} ×${it.qty}` : it.name)).join(", ")}
                    </span>
                    <span className="shrink-0 font-mono text-[11px] text-fg-4 nums">{r.id}</span>
                  </span>
                  <span className="mt-1.5 flex items-center justify-between gap-3">
                    <DeliveryCell status={statusOf(r)} deliveryMs={r.deliveryMs} manual={Boolean(overrides[r.id])} serverOffline={serverById.get(r.serverId)?.status === "offline"} retry={r.retry} compact />
                    <span className="shrink-0 text-[11.5px] whitespace-nowrap text-fg-4 nums">{formatRelative(r.createdAt, NOW_MS)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <AnimatePresence>
        {selected.size > 0 ? (
          <motion.div
            key="bulk"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 lg:pl-[248px]"
          >
            <div
              role="toolbar"
              aria-label="Действия с выбранными заказами"
              className="pointer-events-auto flex max-w-full items-center gap-1 rounded-xl border border-line-strong bg-surface-3 p-1.5 pl-3.5 shadow-pop"
            >
              <span className="mr-2 font-mono text-[12px] whitespace-nowrap text-fg nums">
                {formatNumber(selected.size)} <span className="text-fg-3">выбрано</span>
              </span>
              <Button size="sm" variant="primary" disabled={!retryable.length} onClick={() => retry(retryable.map((r) => r.id), "bulk")}>
                <RotateCw />
                <span className="hidden sm:inline">Повторить выдачу</span>
                {retryable.length ? <span className="font-mono text-[11px] opacity-80 nums">{retryable.length}</span> : null}
              </Button>
              <Button size="sm" variant="ghost" onClick={exportSelected}>
                <Download />
                <span className="hidden sm:inline">Экспорт выбранных</span>
              </Button>
              <Button size="icon-sm" variant="ghost" aria-label="Снять выделение" onClick={clearSelection}>
                <X />
              </Button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <OrderSheet
        openId={openId}
        detail={detail}
        row={openRow}
        loading={detailPending}
        override={openId ? overrides[openId] : undefined}
        onClose={close}
        onRetry={(id) => retry([id], "sheet")}
        onRefund={refund}
        canStep={index >= 0 && rows.length > 1}
      />
    </>
  );
}

function ItemsText({ items }: { items: OrderRow["items"] }) {
  return (
    <span className="block truncate">
      {items.map((it, i) => (
        <React.Fragment key={i}>
          {i > 0 ? <span className="text-fg-4">, </span> : null}
          <span className="text-fg-2">{it.name}</span>
          {it.qty > 1 ? <span className="font-mono text-[12px] text-fg-3"> ×{it.qty}</span> : null}
        </React.Fragment>
      ))}
    </span>
  );
}

function SourceTag({ row }: { row: OrderRow }) {
  if (row.promoCode)
    return (
      <Tooltip content={`Промокод ${row.promoCode}`}>
        <span className="rounded-xs bg-ice-400/10 px-1 py-px font-mono text-[11px] text-ice-300">{row.promoCode}</span>
      </Tooltip>
    );
  if (row.creatorCode)
    return (
      <Tooltip content={`Код блогера ${row.creatorCode}`}>
        <span className="rounded-xs bg-azure-500/12 px-1 py-px font-mono text-[11px] text-azure-300">@{row.creatorCode}</span>
      </Tooltip>
    );
  return null;
}

function DeliveryCell({
  status,
  deliveryMs,
  manual,
  compact,
  serverOffline,
  retry,
}: {
  status: OrderStatus;
  deliveryMs?: number;
  manual?: boolean;
  compact?: boolean;
  serverOffline?: boolean;
  retry?: OrderRow["retry"];
}) {
  const meta = orderStatusMeta[status];
  let note: string | null = null;
  if (manual && status === "delivering") note = "в очереди";
  else if (status === "delivered" && deliveryMs !== undefined)
    note = deliveryMs > 60_000 ? `${compact ? "" : "при входе · "}${formatDeliveryTime(deliveryMs)}` : formatDeliveryTime(deliveryMs);
  else if (status === "awaiting_player") note = "ждёт входа";
  else if (status === "retrying" && serverOffline) note = compact ? "очередь" : "ждёт сервер";
  else if (status === "retrying" && retry) note = compact ? `${retry.done}/${retry.max}` : `${retry.done} из ${retry.max}`;
  else if (status === "failed") note = compact ? "5/5" : "попытки закончились";
  return (
    <Tooltip content={meta.hint}>
      <span className="inline-flex items-center gap-2 whitespace-nowrap">
        <Badge tone={meta.tone} dot className={cn(status === "delivering" && "[&>span:first-child]:animate-pulse-dot")}>
          {meta.label}
        </Badge>
        {note && status !== "awaiting_player" ? <span className="font-mono text-[11.5px] text-fg-3 nums">{note}</span> : null}
      </span>
    </Tooltip>
  );
}
