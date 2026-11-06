"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { AlertTriangle, ChevronRight, CornerDownRight, FileCheck2, Route, SearchX } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDateShort, formatDuration, formatMoney, formatTime, formatWeekday, plural } from "@/lib/format";
import { payoutStatusMeta } from "@/lib/mock/meta";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Segmented } from "@/components/ui/segmented";
import { Table, TableWrap, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { StatStrip } from "@/components/dashboard/system/settings-ui";
import type { FinanceMember, PayoutRow } from "./types";

const TAX_LABEL = {
  self_employed: "самозанятый — чек формируется сам",
  ip: "ИП — акт раз в месяц",
  individual: "физлицо",
} as const;

export function PayoutsTable({ payouts, members }: { payouts: PayoutRow[]; members: FinanceMember[] }) {
  const [filter, setFilter] = React.useState<"all" | "issues">("all");
  const [expanded, setExpanded] = React.useState<string | null>(null);
  const [showAll, setShowAll] = React.useState(false);
  const byId = React.useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

  const paid = payouts.filter((p) => p.status === "paid");
  const paidSum = paid.reduce((a, p) => a + p.amount, 0);
  const avgMs = paid.reduce((a, p) => a + (p.paidAt ? new Date(p.paidAt).getTime() - new Date(p.createdAt).getTime() : 0), 0) / (paid.length || 1);
  const failedCount = payouts.filter((p) => p.status === "failed").length;

  const rows = filter === "issues" ? payouts.filter((p) => p.status === "failed" || p.retryOf) : payouts;
  // 14 rows by default — enough to include the latest incident and its retry
  const visible = showAll || filter === "issues" ? rows : rows.slice(0, 14);
  const toggle = (id: string) => setExpanded((cur) => (cur === id ? null : id));

  return (
    <div className="space-y-4">
      <StatStrip
        items={[
          { label: "Выплачено за 30 дней", value: formatMoney(paidSum), hint: `${paid.length} ${plural(paid.length, ["выплата", "выплаты", "выплат"])} по СБП` },
          { label: "Среднее зачисление", value: formatDuration(avgMs), hint: "от отправки до денег на карте" },
          { label: "Сбоев", value: String(failedCount), hint: "переотправлено резервным банком", tone: failedCount ? "warn" : "ok" },
          { label: "Комиссия за выплаты", value: formatMoney(0), hint: "плановые выплаты бесплатны" },
        ]}
      />

      <section className="rounded-xl border border-line bg-surface shadow-raise">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-soft px-4 py-3 sm:px-5">
          <div>
            <h2 className="text-sm font-semibold tracking-[-0.01em] text-fg">История выплат</h2>
            <p className="mt-0.5 text-[12.5px] text-fg-3">Каждая выплата покрывает выручку предыдущего дня. Нажмите строку, чтобы увидеть доли.</p>
          </div>
          <Segmented
            value={filter}
            onChange={(v) => {
              setFilter(v);
              setExpanded(null);
            }}
            options={[
              { value: "all", label: "Все" },
              { value: "issues", label: "Сбои и повторы" },
            ]}
          />
        </div>

        {visible.length === 0 ? (
          <EmptyState
            icon={<SearchX />}
            title="Сбоев не было"
            description="Если основной банк не примет перевод, выплата появится здесь вместе с повтором через резервный."
          />
        ) : (
          <>
            {/* phones: stacked rows, the details open as a plain block under the row */}
            <ul className="md:hidden">
              {visible.map((p) => (
                <PayoutCard key={p.id} payout={p} byId={byId} open={expanded === p.id} onToggle={() => toggle(p.id)} />
              ))}
            </ul>

            <TableWrap className="hidden md:block">
              <Table className="min-w-[640px]">
                <THead>
                  <TR>
                    <TH className="w-8 pr-0" aria-label="Развернуть" />
                    <TH>Дата</TH>
                    <TH className="text-right">Сумма</TH>
                    <TH>Маршрут</TH>
                    <TH>Получатели</TH>
                    <TH>Статус</TH>
                    <TH className="text-right">Зачислено за</TH>
                  </TR>
                </THead>
                <TBody>
                  {visible.map((p) => (
                    <PayoutRowView key={p.id} payout={p} byId={byId} open={expanded === p.id} onToggle={() => toggle(p.id)} />
                  ))}
                </TBody>
              </Table>
            </TableWrap>
          </>
        )}

        {!showAll && filter === "all" && rows.length > 14 ? (
          <div className="border-t border-line-soft px-4 py-2.5 sm:px-5">
            <Button variant="ghost" size="xs" onClick={() => setShowAll(true)}>
              Показать все {rows.length}
            </Button>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function statusLabel(p: PayoutRow) {
  return p.retryOf ? "Выплачено повторно" : payoutStatusMeta[p.status].label;
}

function StatusBadge({ payout: p }: { payout: PayoutRow }) {
  const meta = payoutStatusMeta[p.status];
  return (
    <Badge tone={meta.tone === "neutral" ? "neutral" : meta.tone} dot className="shrink-0">
      {statusLabel(p)}
    </Badge>
  );
}

function RouteLabel({ payout: p }: { payout: PayoutRow }) {
  return (
    <span className="flex items-center gap-1.5 text-[12.5px] whitespace-nowrap">
      <Route className={cn("size-3.5 shrink-0", p.route === "backup" ? "text-warn" : "text-fg-4")} />
      {p.route === "backup" ? "Резервный · Точка" : "Т-Банк · СБП"}
    </span>
  );
}

function Recipients({ payout: p, byId, size = 22 }: { payout: PayoutRow; byId: Map<string, FinanceMember>; size?: number }) {
  return (
    <span className="flex shrink-0 items-center gap-1">
      {p.splits.map((s) => {
        const m = byId.get(s.memberId);
        return m ? <Avatar key={s.memberId} name={m.name} size={size} /> : null;
      })}
    </span>
  );
}

/** Mobile row: date and amount, status on the right; recipients and route on the second line. */
function PayoutCard({
  payout: p,
  byId,
  open,
  onToggle,
}: {
  payout: PayoutRow;
  byId: Map<string, FinanceMember>;
  open: boolean;
  onToggle: () => void;
}) {
  const reduce = useReducedMotion();
  const isRetry = !!p.retryOf;
  const failed = p.status === "failed";
  const panelId = `payout-m-${p.id}`;
  return (
    <li className={cn("border-b border-line-soft last:border-0", failed && "bg-bad/[0.03]", isRetry && "bg-ok/[0.02]")}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
        className="flex w-full items-start gap-2 px-4 py-3 text-left transition-colors outline-none hover:bg-white/[0.02] focus-visible:bg-white/[0.04]"
      >
        <ChevronRight className={cn("mt-0.5 size-4 shrink-0 text-fg-3 transition-transform duration-200", open && "rotate-90")} />
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-baseline gap-2">
              {isRetry ? <CornerDownRight className="size-3.5 shrink-0 self-center text-fg-4" /> : null}
              <span className="font-mono text-[13px] text-fg nums">{formatDateShort(p.createdAt)}</span>
              <span className="truncate font-mono text-[12px] text-fg-4 nums">
                {formatWeekday(p.createdAt)} {formatTime(p.createdAt)}
              </span>
            </span>
            <StatusBadge payout={p} />
          </span>
          <span className="mt-1.5 flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-2 text-fg-3">
              <Recipients payout={p} byId={byId} size={18} />
              <RouteLabel payout={p} />
            </span>
            <span className={cn("shrink-0 font-mono text-[13px] nums", failed ? "text-fg-3 line-through decoration-bad/50" : "text-fg")}>
              {formatMoney(p.amount)}
            </span>
          </span>
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open ? (
          <motion.div
            id={panelId}
            initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            animate={reduce ? { opacity: 1 } : { height: "auto", opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="border-t border-line-soft bg-surface-2/50 px-4 py-3.5">
              <PayoutDetails payout={p} byId={byId} />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </li>
  );
}

function PayoutRowView({
  payout: p,
  byId,
  open,
  onToggle,
}: {
  payout: PayoutRow;
  byId: Map<string, FinanceMember>;
  open: boolean;
  onToggle: () => void;
}) {
  const reduce = useReducedMotion();
  const tookMs = p.paidAt ? new Date(p.paidAt).getTime() - new Date(p.createdAt).getTime() : null;
  const isRetry = !!p.retryOf;
  const failed = p.status === "failed";
  const panelId = `payout-${p.id}`;

  return (
    <>
      <TR interactive data-selected={open} onClick={onToggle} className={cn(failed && "bg-bad/[0.03]", isRetry && "bg-ok/[0.02]")}>
        <TD className="w-8 pr-0">
          <button
            type="button"
            aria-expanded={open}
            aria-controls={panelId}
            aria-label={open ? "Свернуть" : "Показать доли"}
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            className="flex size-6 items-center justify-center rounded-sm text-fg-3 transition-colors hover:bg-white/[0.06] hover:text-fg"
          >
            <ChevronRight className={cn("size-4 transition-transform duration-200", open && "rotate-90")} />
          </button>
        </TD>
        <TD>
          <div className="flex items-center gap-2">
            {isRetry ? <CornerDownRight className="size-3.5 text-fg-4" /> : null}
            <span className="font-mono text-fg nums">{formatDateShort(p.createdAt)}</span>
            <span className="font-mono text-[12px] text-fg-4 nums">
              {formatWeekday(p.createdAt)} {formatTime(p.createdAt)}
            </span>
          </div>
        </TD>
        <TD className={cn("text-right font-mono nums", failed ? "text-fg-3 line-through decoration-bad/50" : "text-fg")}>{formatMoney(p.amount)}</TD>
        <TD>
          <RouteLabel payout={p} />
        </TD>
        <TD>
          <Recipients payout={p} byId={byId} />
        </TD>
        <TD>
          <StatusBadge payout={p} />
        </TD>
        <TD className="text-right font-mono text-[12.5px] text-fg-3 nums">
          {tookMs !== null ? formatDuration(tookMs) : p.status === "processing" ? "в пути" : "—"}
        </TD>
      </TR>
      <tr className="border-0">
        <td colSpan={7} className="p-0">
          <AnimatePresence initial={false}>
            {open ? (
              <motion.div
                id={panelId}
                initial={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
                animate={reduce ? { opacity: 1 } : { height: "auto", opacity: 1 }}
                exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                <div className="border-b border-line-soft bg-surface-2/50 px-5 py-4 pl-[52px]">
                  <PayoutDetails payout={p} byId={byId} />
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </td>
      </tr>
    </>
  );
}

/** What happened with a payout and how it was split — shared by the table and the mobile list. */
function PayoutDetails({ payout: p, byId }: { payout: PayoutRow; byId: Map<string, FinanceMember> }) {
  const tookMs = p.paidAt ? new Date(p.paidAt).getTime() - new Date(p.createdAt).getTime() : null;
  return (
    <>
      {p.status === "failed" ? (
        <div className="mb-3 flex gap-2.5 rounded-lg border border-bad/20 bg-bad-soft px-3 py-2.5 text-[12.5px] text-fg-2">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-bad" />
          <div className="min-w-0">
            <p className="font-medium text-fg">Т-Банк вернул технический отказ по исходящим СБП-переводам</p>
            <p className="mt-0.5 text-fg-3">
              Отказ пришёл в {formatTime(p.createdAt)}. Через 40 минут выплата ушла резервным маршрутом через Точку — строка выше. Деньги никуда не
              пропадали: до повтора они оставались на балансе.
            </p>
          </div>
        </div>
      ) : null}
      {p.retryOf ? (
        <p className="mb-3 text-[12.5px] text-fg-3">
          Повтор выплаты от {formatDateShort(p.createdAt)}: основной банк не отправил перевод, резервный маршрут зачислил деньги за{" "}
          {tookMs !== null ? formatDuration(tookMs) : "—"}.
        </p>
      ) : null}
      <ul className="grid gap-2 lg:grid-cols-3">
        {p.splits.map((s) => {
          const m = byId.get(s.memberId);
          if (!m) return null;
          return (
            <li key={s.memberId} className="min-w-0 rounded-lg border border-line-soft bg-surface px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-2">
                  <Avatar name={m.name} size={22} />
                  <span className="truncate text-[13px] text-fg">{m.name}</span>
                </span>
                <span className="font-mono text-[13px] text-fg nums">{formatMoney(s.amount)}</span>
              </div>
              <p className="mt-1.5 truncate font-mono text-[11.5px] text-fg-3">
                {m.splitPct} % · {m.payoutDestination ?? "реквизиты не указаны"}
              </p>
              {m.taxStatus ? (
                <p className="mt-1 flex items-center gap-1 text-[11.5px] text-fg-3">
                  <FileCheck2 className="size-3 text-ok" />
                  {TAX_LABEL[m.taxStatus]}
                </p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </>
  );
}
