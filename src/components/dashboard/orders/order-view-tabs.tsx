"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/format";
import { ORDER_VIEWS, ORDER_VIEW_LABELS, ordersHref, type OrderView, type OrdersQuery } from "./params";
import { useUrlNav } from "./url-nav";

const ATTENTION: Partial<Record<OrderView, string>> = {
  issues: "bg-bad-soft text-bad",
  awaiting: "bg-ice-400/10 text-ice-300",
};

/** Saved views as underline tabs. Counts reflect the current search/method/server/period. */
export function OrderViewTabs({ query, counts }: { query: OrdersQuery; counts: Record<OrderView, number> }) {
  const { navigate } = useUrlNav();
  const [view, setView] = React.useOptimistic(query.view);

  return (
    <nav aria-label="Представления заказов" className="scrollbar-none -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div className="flex min-w-max items-center gap-5 border-b border-line">
        {ORDER_VIEWS.map((v) => {
          const href = ordersHref(query, { view: v, status: "all", page: 1, id: undefined });
          const active = view === v;
          const n = counts[v];
          return (
            <Link
              key={v}
              href={href}
              scroll={false}
              aria-current={active ? "page" : undefined}
              onClick={(e) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
                e.preventDefault();
                navigate(href, { optimistic: () => setView(v) });
              }}
              className={cn(
                "relative inline-flex h-10 items-center gap-2 text-[13px] font-medium whitespace-nowrap transition-colors outline-none",
                "after:absolute after:inset-x-0 after:-bottom-px after:h-px after:transition-colors",
                "focus-visible:text-fg focus-visible:after:bg-azure-400",
                active ? "text-fg after:bg-fg" : "text-fg-3 after:bg-transparent hover:text-fg-2",
              )}
            >
              {ORDER_VIEW_LABELS[v]}
              <span
                className={cn(
                  "inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-xs px-1 font-mono text-[10.5px] nums",
                  n > 0 && ATTENTION[v] ? ATTENTION[v] : active ? "bg-white/[0.08] text-fg-2" : "bg-white/[0.04] text-fg-3",
                )}
              >
                {formatNumber(n)}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
