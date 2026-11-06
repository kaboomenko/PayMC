"use client";

import * as React from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { LIVE_METHODS, PAYMENT_METHODS } from "@/lib/payments";
import { orderStatusMeta } from "@/lib/mock/meta";
import type { OrderStatus, PaymentMethod } from "@/lib/mock/types";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { Segmented } from "@/components/ui/segmented";
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  CLEARED_ORDER_FILTERS,
  ORDER_PERIODS,
  ORDER_PERIOD_LABELS,
  ORDER_STATUSES,
  hasOrderFilters,
  ordersHref,
  type OrderPeriod,
  type OrdersQuery,
} from "./params";
import type { ServerOption } from "./types";
import { useUrlNav } from "./url-nav";

const TONE_DOT: Record<string, string> = {
  ok: "bg-ok",
  azure: "bg-azure-400",
  ice: "bg-ice-400",
  warn: "bg-warn",
  bad: "bg-bad",
  neutral: "bg-fg-4",
};

const SERVER_DOT = { online: "bg-ok", degraded: "bg-warn", offline: "bg-bad" } as const;

export function OrdersFilterBar({ query, servers }: { query: OrdersQuery; servers: ServerOption[] }) {
  const { navigate } = useUrlNav();
  const [optimistic, setOptimistic] = React.useOptimistic(query);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // search text is local (instant typing) and pushed to the URL after a pause
  const [text, setText] = React.useState(query.q);
  const [pushed, setPushed] = React.useState(query.q);
  const [seenQ, setSeenQ] = React.useState(query.q);
  if (query.q !== seenQ) {
    setSeenQ(query.q);
    // changed from outside (reset link, sidebar) — not by our own debounce
    if (query.q !== pushed) {
      setText(query.q);
      setPushed(query.q);
    }
  }

  const apply = React.useCallback(
    (patch: Partial<OrdersQuery>) => {
      const next = { ...optimistic, ...patch, page: 1, id: undefined };
      navigate(ordersHref(next), { optimistic: () => setOptimistic(next) });
    },
    [navigate, optimistic, setOptimistic],
  );

  React.useEffect(() => {
    if (text.trim() === pushed.trim()) return;
    const t = window.setTimeout(() => {
      setPushed(text);
      apply({ q: text });
    }, 280);
    return () => window.clearTimeout(t);
  }, [text, pushed, apply]);

  // "/" is the palette shortcut in the shell; F focuses the order search
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "f" || e.key === "а") {
        if (document.querySelector('[role="dialog"]')) return;
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const filtered = hasOrderFilters({ ...optimistic, q: text });

  return (
    <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
      <div className="relative min-w-0 flex-1">
        <Input
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape" && text) {
              e.preventDefault();
              setText("");
            }
          }}
          leading={<Search />}
          trailing={
            text ? (
              <button
                type="button"
                onClick={() => {
                  setText("");
                  inputRef.current?.focus();
                }}
                aria-label="Очистить поиск"
                className="flex size-6 items-center justify-center rounded-sm text-fg-3 hover:bg-white/[0.06] hover:text-fg"
              >
                <X className="size-3.5" />
              </button>
            ) : (
              <Kbd className="mr-1 hidden sm:inline-flex">F</Kbd>
            )
          }
          placeholder="ID, ник, товар, промокод, код блогера"
          aria-label="Поиск заказов"
          spellCheck={false}
          className="w-full [&_input]:h-8 [&_input]:text-[13px]"
        />
      </div>

      <div className="grid grid-cols-3 gap-2 sm:flex sm:items-center">
        <Select value={optimistic.status} onValueChange={(v) => apply({ status: v as OrderStatus | "all" })}>
          <SelectTrigger size="sm" aria-label="Статус выдачи" className={cn("sm:w-[150px]", optimistic.status !== "all" && "border-azure-500/40 text-fg")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              <ShortLabel short="Статус" full="Все статусы" />
            </SelectItem>
            <SelectSeparator />
            {ORDER_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                <span className="flex items-center gap-2">
                  <span className={cn("size-1.5 rounded-full", TONE_DOT[orderStatusMeta[s].tone])} />
                  {orderStatusMeta[s].label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={optimistic.method} onValueChange={(v) => apply({ method: v as PaymentMethod | "all" })}>
          <SelectTrigger size="sm" aria-label="Способ оплаты" className={cn("sm:w-[150px]", optimistic.method !== "all" && "border-azure-500/40 text-fg")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              <ShortLabel short="Оплата" full="Все способы" />
            </SelectItem>
            <SelectSeparator />
            {LIVE_METHODS.map((m) => (
              <SelectItem key={m} value={m}>
                {PAYMENT_METHODS[m].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={optimistic.server} onValueChange={(v) => apply({ server: v })}>
          <SelectTrigger size="sm" aria-label="Сервер" className={cn("sm:w-[140px]", optimistic.server !== "all" && "border-azure-500/40 text-fg")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              <ShortLabel short="Сервер" full="Все серверы" />
            </SelectItem>
            <SelectSeparator />
            {servers.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                <span className="flex items-center gap-2">
                  <span className={cn("size-1.5 rounded-full", SERVER_DOT[s.status])} />
                  {s.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {optimistic.creator || optimistic.promo ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {optimistic.creator ? <CodeChip label="Код блогера" code={optimistic.creator} onRemove={() => apply({ creator: undefined })} /> : null}
          {optimistic.promo ? <CodeChip label="Промокод" code={optimistic.promo} onRemove={() => apply({ promo: undefined })} /> : null}
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-2">
        <Segmented<OrderPeriod>
          value={optimistic.days}
          onChange={(v) => apply({ days: v })}
          options={ORDER_PERIODS.map((p) => ({ value: p, label: ORDER_PERIOD_LABELS[p] }))}
          className="shrink-0"
        />
        {filtered ? (
          <button
            type="button"
            onClick={() => {
              setText("");
              setPushed("");
              apply(CLEARED_ORDER_FILTERS);
            }}
            className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-[12.5px] text-fg-3 transition-colors hover:bg-white/[0.05] hover:text-fg"
          >
            <X className="size-3.5" /> Сбросить
          </button>
        ) : null}
      </div>
    </div>
  );
}

/** Exact-code filter that arrives from a link (creators, promo codes) — removable in one click. */
function CodeChip({ label, code, onRemove }: { label: string; code: string; onRemove: () => void }) {
  return (
    <span className="inline-flex h-8 items-center gap-1.5 rounded-md border border-azure-500/40 bg-azure-500/[0.06] pr-1 pl-2.5 text-[12.5px] whitespace-nowrap">
      <span className="text-fg-3">{label}</span>
      <span className="font-mono text-fg">{code}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Убрать фильтр: ${label.toLowerCase()} ${code}`}
        className="flex size-6 items-center justify-center rounded-sm text-fg-3 transition-colors hover:bg-white/[0.06] hover:text-fg focus-visible:text-fg"
      >
        <X className="size-3.5" />
      </button>
    </span>
  );
}

/** Short field name in a narrow phone trigger, full «Все …» from sm up. */
function ShortLabel({ short, full }: { short: string; full: string }) {
  return (
    <>
      <span className="sm:hidden">{short}</span>
      <span className="hidden sm:inline">{full}</span>
    </>
  );
}
