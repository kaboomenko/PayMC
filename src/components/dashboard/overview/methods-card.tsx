"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { CHART } from "@/components/charts";
import { cn } from "@/lib/utils";
import { formatMoney, formatPercent } from "@/lib/format";
import { PAYMENT_METHODS } from "@/lib/payments";
import { PanelHeader } from "./bits";
import type { MethodSlice } from "./types";

const HOLD_ORDER = ["без холда", "холд 24 ч", "до 3 дней"];
// one accent (money available today), the rest in neutral steps
const HOLD_COLOR: Record<string, string> = { "без холда": CHART.azureStrong, "холд 24 ч": CHART.axis, "до 3 дней": "#2c3446" };

export function MethodsCard({ methods }: { methods: MethodSlice[] }) {
  const top = methods[0];
  const total = methods.reduce((a, m) => a + m.amount, 0) || 1;
  const byHold = HOLD_ORDER.map((h) => ({
    label: h,
    amount: methods.filter((m) => m.settlement === h).reduce((a, m) => a + m.amount, 0),
  })).filter((h) => h.amount > 0);

  return (
    <Card className="flex min-w-0 flex-col overflow-hidden">
      <PanelHeader
        title="Способы оплаты"
        meta={<span className="text-[11px]">30 дней</span>}
        actions={
          <Link href="/dashboard/analytics" className="inline-flex items-center gap-1 rounded-sm text-xs text-fg-3 transition-colors hover:text-fg">
            Аналитика <ArrowRight className="size-3.5" />
          </Link>
        }
      />
      {top ? (
        <p className="px-4 pt-4 text-[13px] text-fg-2 sm:px-5">
          <span className="font-mono text-fg nums">{formatPercent((top.amount / total) * 100, { digits: 0 })}</span> оборота — {PAYMENT_METHODS[top.key].label}
        </p>
      ) : null}
      <ul className="space-y-2.5 px-4 pt-3 pb-4 sm:px-5">
        {methods.map((m, i) => {
          const share = m.amount / total;
          return (
            <li key={m.key} className="grid grid-cols-[84px_minmax(0,1fr)_48px_76px] items-center gap-3 text-[13px]">
              <span className="truncate text-fg-2" title={PAYMENT_METHODS[m.key].label}>
                {PAYMENT_METHODS[m.key].short}
              </span>
              <span className="h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
                <span className={cn("block h-full rounded-full", i === 0 ? "bg-azure-500" : "bg-fg-4")} style={{ width: `${Math.max(2, share * 100)}%` }} />
              </span>
              <span className="text-right font-mono text-xs text-fg-2 nums">{formatPercent(share * 100, { digits: share < 0.1 ? 1 : 0 })}</span>
              <span className="text-right font-mono text-xs text-fg-4 nums">{formatMoney(m.amount)}</span>
            </li>
          );
        })}
      </ul>

      <div className="mt-auto border-t border-line-soft px-4 pt-3 pb-3.5 sm:px-5">
        <p className="text-xs text-fg-3">Когда деньги доступны к выплате</p>
        <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
          {byHold.map((h) => (
            <span key={h.label} className="h-full first:rounded-l-full last:rounded-r-full" style={{ width: `${(h.amount / total) * 100}%`, background: HOLD_COLOR[h.label] }} />
          ))}
        </div>
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11.5px] text-fg-3">
          {byHold.map((h) => (
            <li key={h.label} className="flex items-center gap-1.5">
              <span aria-hidden className="size-2 rounded-[2px]" style={{ background: HOLD_COLOR[h.label] }} />
              {h.label}
              <span className="font-mono text-fg-2 nums">{formatPercent((h.amount / total) * 100, { digits: 0 })}</span>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
