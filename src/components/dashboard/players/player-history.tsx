"use client";

import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, Hand, ReceiptText } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatMoney, formatNumber, formatRelative } from "@/lib/format";
import { NOW_MS } from "@/lib/mock/now";
import { orderStatusMeta } from "@/lib/mock/meta";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Tooltip } from "@/components/ui/tooltip";
import { formatExact } from "@/components/dashboard/orders/format";
import { usePlayer, type PlayerOrderRow } from "./player-context";

export function PlayerHistory({ rows, total, allHref }: { rows: PlayerOrderRow[]; total: number; allHref: string }) {
  const { grants } = usePlayer();
  const reduce = useReducedMotion();
  const list = [...grants, ...rows];

  if (!list.length) {
    return (
      <EmptyState
        icon={<ReceiptText />}
        title="Покупок пока нет"
        description="Игрок заходит, но ещё ничего не купил. Кампания «10 часов без покупок» предложит ему мягкий оффер сама."
      />
    );
  }

  const itemsText = (o: PlayerOrderRow) => o.items.map((it) => (it.qty > 1 ? `${it.name} ×${it.qty}` : it.name)).join(", ");

  return (
    <>
      {/* Phone: stacked rows, same layout as the orders list */}
      <ul className="divide-y divide-line-soft md:hidden">
        <AnimatePresence initial={false}>
          {list.map((o) => {
            const meta = orderStatusMeta[o.status];
            return (
              <motion.li
                key={o.id}
                layout={reduce ? false : "position"}
                initial={o.manual && !reduce ? { opacity: 0, backgroundColor: "rgba(51,119,255,0.16)" } : false}
                animate={{ opacity: 1, backgroundColor: "rgba(51,119,255,0)" }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1], backgroundColor: { duration: 0.6 } }}
              >
                {o.manual ? (
                  <div className="px-4 py-3">
                    <HistoryRowBody o={o} meta={meta} items={itemsText(o)} />
                  </div>
                ) : (
                  <Link href={`/dashboard/orders?id=${o.id}`} className="block px-4 py-3 transition-colors hover:bg-white/[0.02] focus-visible:bg-white/[0.03]">
                    <HistoryRowBody o={o} meta={meta} items={itemsText(o)} />
                  </Link>
                )}
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>

      {/* Tablet / desktop: table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[560px] text-[13px]">
          <thead>
            <tr className="border-b border-line">
              {["Заказ", "Товары", "Сумма", "Выдача", "Когда"].map((h, i) => (
                <th
                  key={h}
                  className={cn(
                    "h-9 px-3 text-left label-mono whitespace-nowrap text-fg-3 first:pl-5 last:pr-5",
                    (i === 2 || i === 4) && "text-right",
                  )}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <AnimatePresence initial={false}>
              {list.map((o) => {
                const meta = orderStatusMeta[o.status];
                return (
                  <motion.tr
                    key={o.id}
                    layout={reduce ? false : "position"}
                    initial={o.manual && !reduce ? { opacity: 0, backgroundColor: "rgba(51,119,255,0.16)" } : false}
                    animate={{ opacity: 1, backgroundColor: "rgba(51,119,255,0)" }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1], backgroundColor: { duration: 0.6 } }}
                    className="border-b border-line-soft last:border-0"
                  >
                    <td className="h-11 px-3 pl-5 whitespace-nowrap">
                      {o.manual ? (
                        <span className="font-mono text-[12.5px] text-fg-3 nums">{o.id}</span>
                      ) : (
                        <Link href={`/dashboard/orders?id=${o.id}`} className="font-mono text-[12.5px] text-fg nums hover:text-azure-200">
                          {o.id}
                        </Link>
                      )}
                    </td>
                    <td className="h-11 max-w-[240px] px-3">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-fg-2">{itemsText(o)}</span>
                        {o.manual ? (
                          <Tooltip content={`Выдано вручную · ${o.manual.reason}`}>
                            <span className="inline-flex shrink-0 items-center gap-1 rounded-xs bg-azure-500/12 px-1.5 py-px text-[11px] text-azure-300">
                              <Hand className="size-3" /> вручную
                            </span>
                          </Tooltip>
                        ) : null}
                      </span>
                    </td>
                    <td className="h-11 px-3 text-right font-mono whitespace-nowrap text-fg nums">
                      {o.manual ? <span className="text-fg-4">0 ₽</span> : formatMoney(o.amount)}
                    </td>
                    <td className="h-11 px-3 whitespace-nowrap">
                      <Badge tone={meta.tone} dot>
                        {meta.label}
                      </Badge>
                    </td>
                    <td className="h-11 px-3 pr-5 text-right whitespace-nowrap">
                      <Tooltip content={`${formatExact(o.createdAt)} · ${o.serverName}`} side="left">
                        <span className="text-[12.5px] text-fg-3 nums">{formatRelative(o.createdAt, NOW_MS)}</span>
                      </Tooltip>
                    </td>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
      {total > rows.length ? (
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-line-soft px-4 py-2.5 text-[12.5px] text-fg-3 sm:px-5">
          <span>
            Показаны последние <span className="font-mono text-fg-2 nums">{formatNumber(rows.length)}</span> из{" "}
            <span className="font-mono text-fg-2 nums">{formatNumber(total)}</span>
          </span>
          <Link href={allHref} className="inline-flex items-center gap-1 font-medium text-azure-300 hover:text-azure-200">
            Все заказы игрока <ArrowRight className="size-3.5" />
          </Link>
        </div>
      ) : null}
    </>
  );
}

function HistoryRowBody({ o, meta, items }: { o: PlayerOrderRow; meta: (typeof orderStatusMeta)[keyof typeof orderStatusMeta]; items: string }) {
  return (
    <>
      <span className="flex items-baseline justify-between gap-3">
        <span className={cn("font-mono text-[12.5px] nums", o.manual ? "text-fg-3" : "text-fg")}>{o.id}</span>
        <span className="shrink-0 font-mono text-[13px] text-fg nums">{o.manual ? <span className="text-fg-4">0 ₽</span> : formatMoney(o.amount)}</span>
      </span>
      <span className="mt-0.5 flex min-w-0 items-center gap-2 text-[12.5px] text-fg-3">
        <span className="min-w-0 truncate">{items}</span>
        {o.manual ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-xs bg-azure-500/12 px-1.5 py-px text-[11px] text-azure-300">
            <Hand className="size-3" /> вручную
          </span>
        ) : null}
      </span>
      <span className="mt-1.5 flex items-center justify-between gap-3">
        <Badge tone={meta.tone} dot>
          {meta.label}
        </Badge>
        <span className="shrink-0 text-[11.5px] whitespace-nowrap text-fg-4 nums">
          {formatRelative(o.createdAt, NOW_MS)} · {o.serverName}
        </span>
      </span>
    </>
  );
}
